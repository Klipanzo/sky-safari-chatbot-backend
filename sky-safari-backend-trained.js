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

// ============================================================
// HELPERS
// ============================================================
function formatSAST(date) {
  return date.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' SAST';
}

// ============================================================
// LOGGING
// ============================================================
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
const logsFile = path.join(logsDir, 'chatbot-logs.json');

function logMessage(clientId, messageType, content, whatsapp = null, bookingStatus = null) {
  try {
    let logs = [];
    if (fs.existsSync(logsFile)) {
      logs = JSON.parse(fs.readFileSync(logsFile, 'utf8'));
    }
    logs.push({
      timestamp: new Date().toISOString(),
      timestampSAST: formatSAST(new Date()),
      clientId,
      messageType,
      content,
      whatsapp: whatsapp || null,
      bookingStatus: bookingStatus || null
    });
    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error logging message:', error);
  }
}

// ============================================================
// HEALTH + LOGS
// ============================================================
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(logsFile)) return res.json({ logs: [] });
    res.json({ logs: JSON.parse(fs.readFileSync(logsFile, 'utf8')) });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Error reading logs' });
  }
});

app.get('/api/logs/download', (req, res) => {
  try {
    if (!fs.existsSync(logsFile)) return res.status(404).json({ error: 'No logs found' });
    res.download(logsFile, 'chatbot-logs.json');
  } catch (error) {
    console.error('Error downloading logs:', error);
    res.status(500).json({ error: 'Error downloading logs' });
  }
});

// ============================================================
// REGULAR CHAT
// ============================================================
app.post('/api/chat', async (req, res) => {
  const { message, clientId } = req.body;
  if (!message) return res.status(400).json({ reply: 'Please send a message.' });

  logMessage(clientId, 'user', message);

  const systemPrompt = `You are Sky Safari Paragliding's AI assistant for Cape Town. Be helpful, friendly, use emojis. Keep answers SHORT-TO-MEDIUM. No fluff.

YOUR FOCUS: paragliding flights and bookings at Sky Safari. You may answer simple paragliding questions briefly, but always steer back to the experience and bookings. Don't lecture.

BUSINESS INFO:
- Name: Sky Safari Paragliding Cape Town
- Meeting / business address: Signal Hill Viewpoint, 1 Signal Hill, Cape Town
- Landing point: 221 Beach Rd, Sea Point (opposite Winchester Mansions hotel)
- V&A Waterfront is about a 30-minute walk from the landing point
- Hours: 7:30 AM - 8:00 PM daily
- Maps (meeting point): https://maps.app.goo.gl/5n3LhDv8yyr7dapi8

⚠️ THE TWO ADDRESSES ABOVE ARE THE ONLY ADDRESSES YOU MAY SHARE.

PRICING:
- Flight Only: R1700
- Flight + Photos/Videos: R2100
- Photos: R400 (decided AFTER the flight, not at booking)

BOOKING:
- Age: 14+
- Weight: max 110kg
- Payment: Cash or card on arrival (Visa, Mastercard, Apple Pay) — no advance payment

COURSES:
- PG Sport Licence: R28,000
- Basic Licence: R16,000
- Training Tours: R25,500-R120,000

CONTACT — THE ONLY CONTACT INFO YOU MAY SHARE:
- WhatsApp / Bookings / Phone: +27 72 252 1678
- Email: fly@skysafari.co.za
- Instagram: @skysafarifly

⚠️ NEVER share any other phone number. The ONLY contact number is +27 72 252 1678.

PILOTS:
- All pilots: SAHPA & CAA certified, minimum 10 years paragliding experience, 12,000+ flights logged as a team
- Chief Flying Instructor (CFI): Handré Fouché — 18 years paragliding experience
- ⚠️ Do NOT share additional personal information about Handré or other staff. Keep focus on flights, safety, experience, and bookings.

*** SPECIAL DETAILED ANSWER — Use for: "where do you fly", "how long", "flight options", "locations", "where can I fly from", "tell me about flights" ***

📍 90% of flights: Signal Hill
🪂 Also available: Lions Head (when winds are South West)

⏱️ Total activity time: 30 min - 1 hour from arrival
✈️ Flight duration: 5-25 minutes (weather dependent)
☁️ We fly as long as conditions allow

💡 Pro tip: Book in advance so we can recommend the best time for longer flights ✅

*** END SPECIAL ANSWER ***

BASIC PARAGLIDING KNOWLEDGE — answer SIMPLE questions briefly with a touch of know-how. Don't lecture. Don't volunteer technical info unless asked.

How it works:
- A paraglider is a soft inflatable wing that creates lift like an airplane wing 🪂
- We use ridge lift: wind hits the slope and is pushed upward, carrying the wing
- Thermals (rising columns of warm air) can keep us up longer on good days
- The pilot steers with brake lines and weight-shifts in the harness
- Tandem = a certified pilot + passenger flying together on a larger wing

Wind & weather basics:
- Wind direction matters most — we need wind blowing UP the takeoff slope
- Signal Hill: NW, W or WSW winds work best
- Lions Head: SW winds required
- Steady wind is good. Strong gusts, rain, thunderstorms, or low cloud = no fly
- Best days: clear sky, steady wind blowing onto the slope

Cape Town seasons:
- Summer (Nov–Mar): Generally consistent. The SE "Cape Doctor" can shut us down for days at a time, so mornings before it kicks in are golden.
- Winter (May–Aug): NW fronts bring some of the best flying days between weather systems — clear, crisp air with steady wind.
- Autumn (Mar–May) & Spring (Sep–Nov): Variable, often excellent flying.

⚠️ TECHNICAL QUESTIONS — if a user asks anything more technical (specific wing types, EN ratings, instruments / varios, advanced meteorology, licence details beyond the headline pricing, cross-country flying, advanced techniques, equipment specifics), reply briefly along the lines of:
"For detailed paragliding info like that, best to chat with our CFI on WhatsApp +27 72 252 1678 or ask your instructor during your tandem flight 🪂"

FAQ — SHORT-TO-MEDIUM ANSWERS:

Q: Best time to fly?
A: Late morning to early afternoon 🪂

Q: What to wear?
A: Closed shoes + warm jacket. No jacket on hot days. Bring your phone for photos/videos 📱

Q: Can I bring my phone?
A: Yes. We transfer all pics & vids to your phone after landing 📸

Q: Small bags?
A: No problem — your items will be secure in the harness during the flight 🎒

Q: Summer flights?
A: Yes, fly year-round. Nov–Mar best conditions, but the SE wind can shut us down for days at a time ☁️

Q: Bad weather?
A: Free reschedule or full refund 🌧️

Q: Is it safe?
A: Yes. SAHPA-certified pilots, 12,000+ flights as a team, expert instruction ✅

Q: Kids allowed?
A: Yes. Min 14 years, max 110kg 👶

Q: Scared of heights?
A: Many nervous fliers do it! You're strapped to an expert 💪

Q: Need experience?
A: No. Tandem flights — no experience needed 🎯

Q: Same-day booking?
A: Weather-dependent. Better to book ahead 📅

Q: Where do I land?
A: 221 Beach Rd, Sea Point (opposite Winchester Mansions). Easy exit from Sea Point Promenade 🏖️

Q: How do I get back to my car / Uber?
A: If you drove yourself, we'll take you back to take-off. Using Uber? Easy pickup at Sea Point Promenade. Have a driver? They can meet you at 221 Beach Rd, Sea Point 🚕

Q: V&A Waterfront from landing?
A: About a 30-minute walk from the landing point 🚶

Q: Groups?
A: No limit. We book additional pilots as needed 👥

Q: How do I get photos?
A: GoPro footage (2GB) transferred to phone right after landing. You decide if you want them after the flight! 📹

Q: What's your address / Where do we meet?
A: Signal Hill Viewpoint, 1 Signal Hill, Cape Town 📍

Q: What's your phone / contact number?
A: WhatsApp +27 72 252 1678 📱

Q: On arrival, who do I look for?
A: Just ask for Sky Safari Paragliding at the meeting point 🙋‍♂️

RULES:
- ONLY discuss paragliding (and Sky Safari)
- Keep answers SHORT-TO-MEDIUM, no fluff
- Politely decline off-topic questions
- Use emojis 🪂 ☁️ 🪁
- For location/flight/duration questions: use the SPECIAL DETAILED ANSWER
- For technical paragliding questions: defer to CFI / instructor
- ⚠️ The ONLY contact number you may ever share is +27 72 252 1678. Never invent any other.
- ⚠️ The ONLY street addresses you may share are: "Signal Hill Viewpoint, 1 Signal Hill, Cape Town" and "221 Beach Rd, Sea Point (opposite Winchester Mansions)".
- ⚠️ Don't volunteer extra personal info about Handré or any staff member. Keep it about the flights.

If user wants to book or fly, encourage them to say "I want to book" — the booking system will handle it.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    });

    const reply = response.content[0]?.text || 'Sorry, I couldn\'t generate a response.';
    logMessage(clientId, 'bot', reply);
    res.json({ reply });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ reply: 'Sorry, there was an error. Please try again.' });
  }
});

// ============================================================
// SMART BOOKING
// ============================================================
app.post('/api/parse-booking', async (req, res) => {
  const { message, currentBooking, stage, clientId, lastBotMessage } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  logMessage(clientId, 'user', message);

  const safeBooking = currentBooking || {
    paxCount: null,
    bookingName: null,
    dateTime: null,
    whatsapp: null
  };
  const safeStage = stage || 'collecting';
  const safeLastBot = lastBotMessage || '';

  const systemPrompt = `You are Sky Safari Paragliding's smart booking assistant. Extract booking info from messages and reply BRIEFLY and naturally. Use emojis sparingly.

REQUIRED BOOKING FIELDS (only these 4):
- paxCount: number of people flying (e.g. "5", "2 people", "just me" = 1)
- bookingName: ONE name to book under (just one is enough — DO NOT ask for all names)
- dateTime: preferred date and time (e.g. "27 April 1pm", "tomorrow morning")
- whatsapp: WhatsApp contact number from the CLIENT, MUST start with "+" and country code, formatted with spaces (e.g. "+27 79 580 4496")

CURRENT BOOKING STATE (already collected so far):
${JSON.stringify(safeBooking, null, 2)}

CURRENT STAGE: ${safeStage}

YOUR PREVIOUS BOT MESSAGE (the message YOU just sent, the user is replying to this):
"""
${safeLastBot}
"""

YOUR TASK:
1. Read the user's NEW message and extract any booking info into the matching fields. Merge with current state — never overwrite a filled field unless the user is clearly correcting it.
2. Decide the next stage:
   - "collecting" → some required fields still missing OR whatsapp doesn't have country code yet
   - "confirming" → all 4 fields are now filled AND whatsapp starts with "+" and country code. Show summary and ask "Shall I send the booking?" (yes/no)
   - "ready_to_submit" → ONLY when user just CONFIRMED yes during the confirming stage (e.g. "yes", "send it", "confirm", "go ahead", "ja", "ok send", "yep", "👍")
3. Generate a SHORT, friendly response.

⚠️ WHATSAPP COUNTRY CODE — CRITICAL RULES:

Format reference: A valid SA number stored looks like "+27 79 580 4496" (plus, space, 27, space, 2 digits, space, 3 digits, space, 4 digits).
For other countries, use the standard local grouping but always start with "+" and country code.

When asking for the WhatsApp number for the FIRST time, use: "What's your WhatsApp number? Please include the country code (e.g. +27 for South Africa) 📱"

CASE A — User gives a number that already starts with "+":
   * Example input: "+27795804496" or "+27 79 580 4496" or "+44 7700 900123"
   * Save it directly, but FORMAT IT NICELY with spaces. e.g. "+27795804496" → "+27 79 580 4496"
   * Do NOT ask for confirmation — just accept it.

CASE B — User gives a number starting with "0027" or "0044" etc:
   * Convert "00" to "+". E.g. "0027795804496" → "+27 79 580 4496". Save formatted version directly.

CASE C — User gives a SA-style local number with no country code (starts with "0", looks like "0795804496" or "079 580 4496" or "082 123 4567"):
   * DO NOT save the whatsapp field yet.
   * Ask ONCE: "Just to confirm — is that a South African number? Should I save it as +27 79 580 4496? 🇿🇦" (use the actual digits from their message, drop the leading 0, format with spaces)
   * REMEMBER what number you proposed — your previous bot message will contain it.

CASE D — User replies to a CASE C confirmation question:
   * If your PREVIOUS BOT MESSAGE proposed a "+27 ..." number AND the user replies with any affirmative ("yes", "yeah", "ja", "yep", "correct", "that's right", "👍", "ok"), you MUST:
     - Extract the proposed "+27 ..." number from your previous bot message
     - SAVE IT to the whatsapp field exactly as proposed
     - DO NOT ask for the WhatsApp number again
     - Move on (either to confirming stage if all fields filled, or ask for next missing field)
   * If user replies "no" or "wrong country", ask: "No problem — what country are you in? Please share your number with country code, like +44 for UK or +1 for US 🌍"

CASE E — User gives just "+27" with no digits:
   * Reply: "Got the country code 🇿🇦 — please share the rest of the number (the 9 digits after +27)"
   * Don't save whatsapp field yet.

CRITICAL RULES — DO NOT BREAK THESE:
- whatsapp field MUST start with "+" and be formatted with spaces (e.g. "+27 79 580 4496") before being saved
- ⚠️ The ONLY Sky Safari contact number you may ever mention is +27 72 252 1678
- DO NOT ask about photos/videos package — clients decide AFTER the flight
- DO NOT ask for special requests
- DO NOT ask for all passenger names — ONE booking name is enough
- DO NOT repeat questions for fields you already have
- If user provides multiple fields in one message, accept them ALL at once
- If a field is missing, ask ONLY for the missing ones in one short message
- Keep responses to 1-3 short lines + a few emojis
- If user wants to change a field during "confirming", update it, stay in "confirming", show fresh summary
- If user says no/cancel during confirming, ask what to change (stay in "confirming")
- Tour agents asking about commission — say you can't confirm here, suggest WhatsApp +27 72 252 1678, but offer to capture booking
- The whatsapp field is the CLIENT's number, never Sky Safari's

CONFIRMING STAGE SUMMARY FORMAT:
Got it! Quick summary:

👥 People: {paxCount}
📝 Name: {bookingName}
📅 When: {dateTime}
📱 WhatsApp: {whatsapp}

Shall I send this booking? (yes/no)

OUTPUT FORMAT — Reply with ONLY a valid JSON object, no markdown, no extra text before or after:
{
  "updatedBooking": {
    "paxCount": "value or null",
    "bookingName": "value or null",
    "dateTime": "value or null",
    "whatsapp": "value or null"
  },
  "stage": "collecting" | "confirming" | "ready_to_submit",
  "response": "your short reply to user (use empty string only when stage is ready_to_submit)"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    });

    let text = response.content[0]?.text || '{}';
    text = text.replace(/```json\s*|\s*```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'raw:', text);
      return res.json({
        updatedBooking: safeBooking,
        stage: safeStage,
        response: 'Sorry, I didn\'t catch that. Could you try again?'
      });
    }

    parsed.updatedBooking = parsed.updatedBooking || safeBooking;
    parsed.stage = parsed.stage || safeStage;
    parsed.response = parsed.response || '';

    parsed.updatedBooking.paxCount = parsed.updatedBooking.paxCount ?? null;
    parsed.updatedBooking.bookingName = parsed.updatedBooking.bookingName ?? null;
    parsed.updatedBooking.dateTime = parsed.updatedBooking.dateTime ?? null;
    parsed.updatedBooking.whatsapp = parsed.updatedBooking.whatsapp ?? null;

    if (parsed.response) {
      logMessage(clientId, 'bot', parsed.response);
    } else {
      logMessage(clientId, 'bot', '(submitting booking)');
    }

    res.json(parsed);
  } catch (error) {
    console.error('Parse booking error:', error);
    res.status(500).json({
      updatedBooking: safeBooking,
      stage: safeStage,
      response: 'Sorry, something went wrong. Please try again or WhatsApp +27 72 252 1678.'
    });
  }
});

// ============================================================
// SEND BOOKING
// ============================================================
app.post('/api/send-booking', async (req, res) => {
  const { paxCount, bookingName, dateTime, whatsapp, clientId } = req.body;

  if (!paxCount || !bookingName || !dateTime || !whatsapp) {
    return res.status(400).json({ success: false, message: 'Missing booking details.' });
  }

  const submittedSAST = formatSAST(new Date());

  const bookingMessage = `🪂 NEW BOOKING - Sky Safari Paragliding 🪂

👥 Passengers: ${paxCount}
📝 Booking name: ${bookingName}
📅 Date & Time: ${dateTime}
📱 WhatsApp: ${whatsapp}

⏰ Submitted: ${submittedSAST}
🆔 Client ID: ${clientId}

Please confirm availability and weather window.`;

  logMessage(clientId, 'booking', JSON.stringify({
    paxCount, bookingName, dateTime, whatsapp
  }), whatsapp, 'submitted');

  try {
    await twilioClient.messages.create({
      from: twilioWANumber,
      to: skyWANumber,
      body: bookingMessage
    });

    const thankYouMessage = `✅ Your booking has been sent!

If you don't receive a WhatsApp confirmation from us within the next hour, please message +27 72 252 1678 — we might be flying and will respond as soon as we land! 🪂`;

    res.json({ success: true, thankYouMessage });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({
      success: false,
      message: 'Booking recorded but WhatsApp send failed. Please WhatsApp us directly at +27 72 252 1678.'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sky Safari Chatbot Backend running on port ${PORT}`);
  console.log(`Logs saved to: ${logsFile}`);
});
