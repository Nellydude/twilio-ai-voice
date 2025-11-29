export default async function handler(req, res) {
  const hasSpeechResult = req.body && req.body.SpeechResult;

  // First time Twilio hits this: no speech yet
  if (!hasSpeechResult) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/api/voice" method="POST" timeout="5">
    <Say language="en-US">
      Hi, thanks for calling. How can I help you today?
    </Say>
  </Gather>
  <Say language="en-US">
    I didn't hear anything. Goodbye.
  </Say>
  <Hangup/>
</Response>`;

    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twiml);
  }

  const userText = req.body.SpeechResult;

  const replyText =
    `You said: "${userText}". ` +
    `This is a test assistant. I'll get smarter soon.`;

  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US">
    ${replyText}
  </Say>
  <Hangup/>
</Response>`;

  res.setHeader("Content-Type", "text/xml");
  return res.status(200).send(twimlResponse);
}
