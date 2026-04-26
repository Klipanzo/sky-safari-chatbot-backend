const express = require('express');
const axios = require('axios');
const twilio = require('twilio');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Twilio Setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Comprehensive FAQ Knowledge Base for Sky Safari
const faqKnowledgeBase = `
You are Sky Safari Paragliding's AI assistant. Your role is to help people book tandem paragliding flights and answer questions about the experience. You are friendly, professional, and knowledgeable. Only discuss paragliding and Sky Safari products—never discuss other topics, law, politics, or anything unrelated to paragliding.

PRICING & BOOKING:
- Tandem Paragliding Flight: R1700 (flight only) or R2100 (flight + photos & videos)
- Photos & Videos Package: R400 additional
- Payment: Cash or Card (Visa, Mastercard, Apple Pay) - pay on arrival
- Booking: Can book in advance or day-of (advance booking recommended for best flying days)
- If weather is bad, we reschedule to a flyable day FREE or offer full refund. Best to pay on the day after your flight.

LOCATIONS:
- PRIMARY: Signal Hill Viewpoint (1 Signal Hill Road, Signal Hill, Cape Town, 8001) - 90% of flights
- ALTERNATIVE: Lions Head (higher elevation, different views) - weather dependent
- Maps link: https://maps.app.goo.gl/5n3LhDv8yyr7dapi8
- Takeoff: Signal Hill Viewpoint or Lions Head parking
- Landing: Sea Point Promenade (221 Beach Rd, opposite Winchester Mansions)

AGE & WEIGHT:
- Minimum age: 14 years old
- Maximum weight: 110kg
- No age maximum - people of all ages fly

FLIGHT DETAILS:
- Duration: 5-20 minutes (weather & wind dependent)
- All flights are INSTRUCTIONAL - you learn about paragliding, control, steering, and how wind works
- Equipment provided: Harness, helmet, paraglider (all EN-A certified, world-class)
- Safety briefing: 15-20 minutes before flight covering take-off, flight, and landing
- Take-off: Simple - you walk, then run a few steps, then you're airborne
- Landing: You stand and walk a few steps forward as you touch down on grass field
- All flights include instruction from SAHPA/CAA certified pilots with 10+ years experience

WHAT TO WEAR:
- Closed-toe shoes (trainers, hiking boots) - essential for take-off & landing
- Warm clothing/light jacket (can get chilly at altitude)
- Sunglasses recommended
- Sunscreen recommended (Cape Town sun is strong)

WHAT TO BRING:
- Phone with 2GB free storage (for photos & videos transfer)
- Small bags/handbags OK - secured in harness backpack during flight
- Valuables safe - pilot will return everything after landing
- Driver's license for ID (national park permit requirement)

OPERATING HOURS:
- Open: Sunrise to Sunset, 7:30 AM to 8:00 PM weather permitting
- Best flying times: Late morning to early afternoon
- Weather dependent - rain, strong wind, or wrong wind direction stops flights
- Morning flights more reliable than afternoon (wind often stronger later)

PHOTOS & VIDEOS:
- Included: Pilot takes GoPro video/photos during your flight
- Cost: R400 for professional photos & videos package
- Delivery: Transferred to your phone immediately after landing using adapter
- Requirement: Have 2GB free phone storage
- Quality: Professional in-flight footage perfect for social media or memories

TRANSPORT:
- Uber/Taxi to Signal Hill: We'll land at Sea Point Promenade (easy to leave from there)
- Sea Point Promenade to V&A Waterfront: 40-minute walk
- Driving yourself: We drive you back to takeoff at Signal Hill after landing
- Have a driver: They can meet you at 221 Beach Rd, Sea Point (landing area)

WEATHER & CONDITIONS:
- Weather dependent: Rain, strong wind, clouds, or wrong wind direction = no fly
- Ideal wind: Southwest wind blowing up the mountain slope
- We monitor conditions constantly for your safety
- If unflyable on your booked date: FREE reschedule or full refund
- Best weather: Usually day after rain; late morning to early afternoon
- Seasonal: Summer (Nov-March) most consistent; winter can also be excellent

SAFETY:
- All pilots: SAHPA & CAA certified, 10+ years experience, 12,000+ flights
- Equipment: World-class, regularly inspected, meets international safety standards
- Safety record: Impeccable - we prioritize your safety above all
- Paragliding with experienced instructor in good weather is safe and fun
- Indemnity form: You'll sign before flight (standard safety waiver)

BOOKING PROCESS:
1. Contact us via WhatsApp: +27 72 252 1678
2. Provide: Your name(s), contact number (with country code), email, preferred date/time, number of people
3. Confirmation: Booking manager confirms booking
4. Instructions: We'll send meeting point details and what to bring
5. Arrival: Come 15 minutes early for paperwork and equipment fitting
6. Safety briefing: 15-20 minutes before flight
7. Flight: 5-20 minutes in air
8. Photos: Transferred to phone immediately after landing

WHAT HAPPENS ON YOUR FLIGHT DAY:
- Arrive 15 minutes early at 1 Signal Hill Road
- Sign indemnity and national park permits
- Receive equipment: Harness and helmet fitted
- Safety briefing: Take-off, flight, landing explained
- Takeoff briefing: Walk, run a few steps, then airborne
- Flight: Experience freedom, learn about wind/control/steering
- Landing: Stand, walk forward, touch down on grass field
- Photos transfer: If booked, transfer to your phone immediately
- Return: We'll take you back to Signal Hill (if driving) or arrange transport from Sea Point

COURSES & TRAINING:
- We offer paragliding licence courses for people wanting to learn to fly solo
- Courses available: 4-day intro, local Cape Town course, or full 12-14 day training tours
- For course details, pricing, and booking: Contact us on WhatsApp +27 72 252 1678
- Tandem flights can count towards licence requirements
- All courses lead to IPPI 4 / SAHPA Basic Licence (internationally recognized)

GROUPS:
- Group bookings: No limit on group size
- We book additional pilots for larger groups
- Group discounts: Available - WhatsApp +27 72 252 1678 to ask
- Perfect for: Team building, celebrations, adventures with friends

CANCELLATION:
- If weather is bad on your date: FREE reschedule to next flyable day
- Full refund: If you can't find a suitable alternative date
- Recommendation: Book early in your stay so we can find alternative dates
- Best to pay day-after flight once conditions are confirmed

CONTACT INFORMATION:
- WhatsApp: +27 72 252 1678 (fastest response)
- Email: fly@skysafari.co.za
- Instagram: @skysafarifly
- Website: www.skysafari.co.za
- Meeting Point: 1 Signal Hill Road, Signal Hill, Cape Town, 8001
- Operating: 7 days a week, weather permitting

FREQUENTLY ASKED QUESTIONS:
Q: Is this safe? A: Yes. All pilots are SAHPA/CAA certified with 10+ years experience. Paragliding with a qualified instructor in good weather is safe.

Q: What if I'm scared of heights? A: Many first-time flyers say it doesn't feel like you're high up - you're focused on the views and the feeling of flying. Most people love it.

Q: What if I'm too heavy? A: Maximum weight is 110kg. Contact us if you're close to the limit.

Q: What if weather is bad? A: We reschedule free to next flyable day or offer full refund. Best to book early in your trip.

Q: How long is the experience? A: About 2 hours total (15-20 min briefing, 5-20 min flight, photos transfer).

Q: Can I bring my phone? A: Yes, bring it for photos/videos (R400 package). You'll need 2GB free storage.

Q: Can my small bag come? A: Yes, fits in harness backpack. Will be returned after landing.

Q: Where do we land? A: Sea Point Promenade, 221 Beach Rd, opposite Winchester Mansions.

Q: How do I get back to Signal Hill? A: If you drive, we take you back. If Uber, it's easy from Sea Point.

Q: Can I do a course? A: Yes. WhatsApp us for course details, dates, and pricing.

Q: Do you take groups? A: Yes! No limit. Contact us for group discounts.

PERSONALITY:
- Be warm, friendly, and encouraging
- Use emojis occasionally to keep tone light (🪂, ✈️, 🌟)
- Always provide specific details (times, prices, phone numbers)
- Never make up information - refer to WhatsApp (+27 72 252 1678) for questions you don't know
- Focus on the joy and safety of paragliding
- Guide people toward booking by asking for their details
`;

// Improved Welcome Message (Multi-part as in user's format)
const welcomeMessages = [
  `👋 Welcome to Sky Safari Paragliding Cape Town! 🪂

🌟 RATES:
- R2100 (Flight + Photos & Videos)
- R1700 (Flight Only)

📍 MEET: Signal Hill Viewpoint (1 Signal Hill Rd)
🪂 LAND: 221 Beach Rd, Sea Point (opp. Winchester Mansions)

✨ Flights depend on weather — we'll pick the best wind window!

👉 Please share your name(s), contact number (with country code), email + preferred date/time.

If we don't reply right away, we're flying — we'll get back to you after landing! 🪂

📸 Follow us: @skysafarifly on Instagram`,

  `📍 HERE'S OUR EXACT LOCATION:
https://maps.app.goo.gl/5n3LhDv8yyr7dapi8

🚕 Using Uber or taxi?
You'll land at Sea Point Promenade—easy to leave from there. 40-min walk to V&A Waterfront if exploring.

🚗 Driving yourself?
We'll take you back to takeoff after the flight.

👥 Have a driver?
They can meet you at 221 Beach Rd, Sea Point (landing area).

👟 WHAT TO WEAR:
Closed shoes + something warm (conditions change quickly at altitude)

📱 PHONE STORAGE:
Please have 2GB free for your flight photos & videos

🎒 SMALL BAGS:
No problem—secure in harness backpack during flight

💳 PAYMENT:
Visa, Mastercard & Apple Pay accepted (or cash on arrival)

🙋‍♂️ ON ARRIVAL:
Ask for Sky Safari Paragliding at Signal Hill parking. Come 15 mins early for paperwork.

✌️🪂 See you in the sky!`,

  `🤖 **I'm the Sky Safari AI booking bot!**

I can help you:
✅ Answer questions about paragliding
✅ Explain pricing, times, safety
✅ Collect your booking details
✅ Send your booking to our team automatically

Our booking manager will confirm with you within hours (we might be flying—we'll contact you after landing!).

Ready to book or have questions? Just ask! 🪂`
];

// API endpoint for chat (Claude AI relay)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message required' });
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: faqKnowledgeBase,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const aiResponse = response.data.content[0].text;
    res.json({ reply: aiResponse });

  } catch (error) {
    console.error('Error calling Claude API:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
});

// API endpoint for booking submission (Twilio WhatsApp)
app.post('/api/send-booking', async (req, res) => {
  try {
    const { paxCount, names, dateTime, whatsapp, specialRequests } = req.body;

    // Validate booking data
    if (!paxCount || !names || !dateTime || !whatsapp) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }

    // Format booking message
    const bookingMessage = `🆕 **NEW BOOKING - Sky Safari Paragliding**

👥 Number of people: ${paxCount}
📝 Names: ${names}
📅 Preferred date & time: ${dateTime}
📱 Contact (WhatsApp): ${whatsapp}
💬 Special requests: ${specialRequests || 'None'}

---
⏱️ Booking submitted via Sky Safari AI Chatbot
🔗 Please confirm with client immediately`;

    // Send via Twilio WhatsApp
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.SKY_SAFARI_WHATSAPP,
      body: bookingMessage
    });

    res.json({ 
      success: true, 
      message: 'Booking submitted! Our team will contact you within hours to confirm.' 
    });

  } catch (error) {
    console.error('Error sending booking:', error);
    res.status(500).json({ 
      error: 'Failed to submit booking',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'sky-safari-chatbot-backend' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sky Safari Chatbot Backend running on port ${PORT}`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
  console.log(`Chat API: POST http://localhost:${PORT}/api/chat`);
  console.log(`Booking API: POST http://localhost:${PORT}/api/send-booking`);
});
