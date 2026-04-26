const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const skyWANumber = process.env.SKY_SAFARI_WHATSAPP;
const twilioWANumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logsFile = path.join(logsDir, 'chatbot-logs.json');

// Log function
function logMessage(clientId, messageType, content, whatsapp = null, bookingStatus = null) {
  try {
    let logs = [];
    if (fs.existsSync(logsFile)) {
      const data = fs.readFileSync(logsFile, 'utf8');
      logs = JSON.parse(data);
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      clientId: clientId,
      messageType: messageType,
      content: content,
      whatsapp: whatsapp || null,
      bookingStatus: bookingStatus || null
    };

    logs.push(logEntry);
    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error logging message:', error);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// View logs endpoint
app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(logsFile)) {
      return res.json({ logs: [] });
    }
    const data = fs.readFileSync(logsFile, 'utf8');
    const logs = JSON.parse(data);
    res.json({ logs });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Error reading logs' });
  }
});

// Download logs endpoint
app.get('/api/logs/download', (req, res) => {
  try {
    if (!fs.existsSync(logsFile)) {
      return res.status(404).json({ error: 'No logs found' });
    }
    res.download(logsFile, 'chatbot-logs.json');
  } catch (error) {
    console.error('Error downloading logs:', error);
    res.status(500).json({ error: 'Error downloading logs' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, clientId } = req.body;

  if (!message) {
    return res.status(400).json({ reply: 'Please send a message.' });
  }

  // Log user message
  logMessage(clientId, 'user', message);

  const systemPrompt = `You are Sky Safari Paragliding's AI booking assistant for Cape Town. Be helpful, friendly, use emojis. Keep answers SHORT - only answer what's asked, no fluff.

BUSINESS INFO:
- Company: Sky Safari Paragliding (Cape Town)
- Locations: Signal Hill (90%) + Lions Head (10%)
- Meet: Signal Hill Viewpoint (1 Signal Hill Rd)
- Land: 221 Beach Rd, Sea Point
- Hours: 7:30 AM - 8:00 PM daily
- Maps: https://maps.app.goo.gl/5n3LhDv8yyr7dapi8

PRICING:
- Flight Only: R1700
- Flight + Photos/Videos: R2100
- Photos: R400 (GoPro, 2GB, transferred to phone)

FLIGHT INFO:
- Duration: 5-10 minutes
- Total time: ~1 hour on-site
- Age: 14+ years
- Weight: max 110kg
- Payment: Cash or card on arrival (no advance payment)

COURSES:
- PG Sport Licence: R28,000
- Basic Licence: R16,000
- Training Tours: R25,500-R120,000

CONTACT:
- WhatsApp: +27 72 252 1678
- Email: fly@skysafari.co.za
- Phone: 079 580 4496

PILOTS:
- SAHPA & CAA certified
- 10+ years, 12,000+ flights
- Handré Fouché (Chief Instructor)

FAQ - ANSWER BRIEFLY:

Q: Best time to fly?
A: Late morning to early afternoon 🪂

Q: What to wear?
A: Closed shoes + warm jacket. No jacket on hot days. Bring your phone for photos/videos 📱

Q: Can I bring my phone?
A: Yes. We transfer all pics & vids to your phone after landing 📸

Q: Summer flights?
A: Yes, fly year-round. Nov-March best conditions ☁️

Q: Bad weather?
A: Free reschedule or full refund 🌧️

Q: Flight length?
A: 5-10 minutes. About 1 hour total on-site ⏱️

Q: Is it safe?
A: Yes. SAHPA certified, 12,000+ flights, expert pilots ✅

Q: Kids allowed?
A: Yes. Min 14 years, max 110kg 👶

Q: Scared of heights?
A: Many nervous fliers do it! You're strapped to an expert 💪

Q: Need experience?
A: No. Tandem flights - no experience needed 🎯

Q: Same-day booking?
A: Weather-dependent. Better to book ahead 📅

Q: Where do I land?
A: Sea Point Promenade (easy exit, close to cafés) 🏖️

Q: Groups?
A: No limit. We book additional pilots as needed 👥

Q: How do I get photos?
A: GoPro footage (2GB) transferred to phone right after landing 📹

RULES:
- ONLY discuss paragliding
- Keep answers SHORT & DIRECT
- NO fluff or extra info
- Politely decline off-topic questions
- Use emojis 🪂 ☁️ 🪁

BOOKING FLOW:
When user says "book" or "want to fly":
1. How many people?
2. Names?
3. Date & time?
4. WhatsApp number?
5. Special requests?
6. Confirm booking`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const reply = response.content[0]?.text || 'Sorry, I couldn\'t generate a response.';
    
    // Log bot response
    logMessage(clientId, 'bot', reply);
    
    res.json({ reply });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ reply: 'Sorry, there was an error. Please try again.' });
  }
});

app.post('/api/send-booking', async (req, res) => {
  const { paxCount, names, dateTime, whatsapp, specialRequests, clientId } = req.body;

  if (!paxCount || !names || !dateTime || !whatsapp) {
    return res.status(400).json({ success: false, message: 'Missing booking details.' });
  }

  const bookingMessage = `🪂 NEW BOOKING - Sky Safari Paragliding 🪂

👥 Passengers: ${paxCount}
📝 Names: ${names}
📅 Date & Time: ${dateTime}
📱 WhatsApp: ${whatsapp}
💬 Special Requests: ${specialRequests}

⏰ Booking Time: ${new Date().toLocaleString()}
🆔 Client ID: ${clientId}

Please confirm availability and weather window.`;

  // Log booking
  logMessage(clientId, 'booking', JSON.stringify({
    paxCount,
    names,
    dateTime,
    whatsapp,
    specialRequests
  }), whatsapp, 'submitted');

  try {
    await twilioClient.messages.create({
      from: twilioWANumber,
      to: skyWANumber,
      body: bookingMessage,
    });

    const thankYouMessage = `Thank you for booking with Sky Safari Paragliding! For any further info or if you do not receive a WhatsApp confirmation, please message us at +27722521678`;

    res.json({
      success: true,
      thankYouMessage: thankYouMessage,
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({
      success: false,
      message: 'Booking recorded but WhatsApp message failed. We will contact you directly.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sky Safari Chatbot Backend running on port ${PORT}`);
  console.log(`Logs saved to: ${logsFile}`);
});
