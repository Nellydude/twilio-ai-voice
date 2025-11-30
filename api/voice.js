export default async function handler(req, res) {
  const hasSpeechResult = req.body && req.body.SpeechResult;
  const userText = hasSpeechResult ? (req.body.SpeechResult || "") : "";
  const apiKey = process.env.OPENAI_API_KEY;

  // First time Twilio hits this: greet and ask what they need
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

  // After the caller says something: use AI to answer
  let aiReply = "Sorry, I'm having trouble answering right now.";

  if (!apiKey) {
    aiReply =
      "Sorry, my brain is not configured yet. Please try again later or contact us another way.";
  } else {
    try {
      const prompt = `
You are a warm, natural-sounding phone receptionist for a real business.
The caller just said: "${userText}".
Speak like a real human: use contractions (I'm, you're, it's), a friendly tone, and simple natural phrases.
Keep your answer short—one or two sentences—like a real phone operator.
If you're not certain about something, say you're not sure instead of inventing information.
      `.trim();

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful phone receptionist." },
            { role: "user", content: prompt },
          ],
          max_tokens: 80,
        }),
      });

      const data = await openaiRes.json();
      const content = data.choices?.[0]?.message?.content;

      if (content && typeof content === "string") {
        aiReply = content.trim();
      } else {
        aiReply = "Sorry, I couldn't understand that. Please try again later.";
      }
    } catch (err) {
      console.error("OpenAI error:", err);
      aiReply = "Sorry, something went wrong while generating a response.";
    }
  }

  // NEW: answer + ask if there’s anything else → allows multi-turn calls
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US">
    ${aiReply}
  </Say>
  <Gather input="speech" action="/api/voice" method="POST" timeout="7">
</Gather>
  <Say language="en-US">
    Thanks for calling, goodbye.
  </Say>
  <Hangup/>
</Response>`;

  res.setHeader("Content-Type", "text/xml");
  return res.status(200).send(twimlResponse);
}
