const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const toNumber = process.env.SKY_SAFARI_WHATSAPP;
const twilioClient = twilio(accountSid, authToken);

// Anthropic API setup
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Relay Claude API calls from frontend
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const faqContext = getFAQContext();

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are a friendly and helpful AI assistant for Sky Safari Paragliding in Cape Town. You have knowledge of their tandem paragliding services.

IMPORTANT BUSINESS INFORMATION:
${faqContext}

GUIDELINES:
1. Answer questions about paragliding, safety, booking, pricing, requirements based on the above information
2. Be friendly, encouraging, and enthusiastic about paragliding
3. If someone wants to book, guide them to say "I want to book" so you can collect their details
4. Keep responses concise (2-3 sentences max) unless they ask for details
5. Always mention WhatsApp +27 722 521 678 if they ask about contacting you
6. If asked about something not in your knowledge, direct them to contact Sky Safari directly

Remember: You're representing Sky Safari Paragliding - be professional but friendly!`,
      messages: [{ role: 'user', content: message }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    if (response.data.content && response.data.content[0]) {
      const aiResponse = response.data.content[0].text;
      res.json({ response: aiResponse });
    } else {
      res.status(500).json({ error: 'No response from Claude' });
    }
  } catch (error) {
    console.error('Error calling Claude API:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to get AI response',
      details: error.message
    });
  }
});

// Booking submission
app.post('/api/send-booking', async (req, res) => {
  try {
    const { paxCount, names, dateTime, whatsapp, specialRequests } = req.body;

    if (!paxCount || !names || !dateTime || !whatsapp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookingMessage = `🆕 New Booking:
👥 PAX: ${paxCount}
📝 Names: ${names}
📅 Date & Time: ${dateTime}
📱 Contact: ${whatsapp}
💬 Special Requests: ${specialRequests || 'None'}`;

    const message = await twilioClient.messages.create({
      body: bookingMessage,
      from: fromNumber,
      to: toNumber,
    });

    console.log(`Booking sent: ${message.sid}`);
    
    res.json({
      success: true,
      messageSid: message.sid,
      message: 'Booking submitted successfully',
    });

  } catch (error) {
    console.error('Error sending booking:', error);
    res.status(500).json({
      error: 'Failed to submit booking',
      details: error.message,
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const getFAQContext = () => {
  return `
TANDEM PARAGLIDING FAQ:

Locations: Signal Hill and Lions Head, Cape Town

Booking:
- Strongly recommended to book in advance
- Book via website or WhatsApp +27 722 521 678
- Book early in your trip so we can find alternative dates if needed

Flight Times:
- Operate 7 days a week (weather dependent)
- Early morning (sunrise) best, middle of day good, afternoons often windy
- Flight duration: 5-20 minutes depending on wind
- Best days to fly: day after rain, late morning bookings

Pricing:
- R2100 (Flight + Photos & Videos)
- R1700 (Flight Only)

Age & Safety:
- Minimum age: 14 years
- All pilots have 10+ years experience and thousands of flights
- Safe with experienced instructor in good weather
- Professional, trained instructors

What to Bring:
- Closed shoes
- Warm clothing (weather can change)
- Have 2-3GB free phone storage for photos/videos
- Small backpacks/handbags can go in harness pocket

Payments:
- Cash or Card accepted on the day
- Visa, Mastercard, Apple Pay available

Takeoff & Landing:
- Takeoff: Signal Hill Road (1 Signal Hill Road)
- Landing: Seapoint Promenade
- Easy Uber access to takeoff
- If you drive, we take you back to your car after landing

Flights Include:
- Training on how paraglider works
- Learn about takeoff, steering, lift, landing
- Photos and videos taken during flight
- Instruction from experienced pilots

Courses:
- Sky Safari is a registered paragliding school
- Tandem flights count towards paragliding license courses
- Instructional courses available on set dates
- Local site guiding for qualified pilots available

Contact: +27 722 521 678 | www.skysafari.co.za`;
};

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sky Safari backend running on port ${PORT}`);
});
