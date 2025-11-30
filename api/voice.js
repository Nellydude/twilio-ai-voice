export default async function handler(req, res) {
  const hasSpeechResult = req.body && req.body.SpeechResult;

  // First time Twilio hits this: ask the caller what they need
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

  // Second time: Twilio sends what the caller said as text
  const userText = req.body.SpeechResult || "";
  const apiKey = process.env.OPENAI_API_KEY;

  let aiReply = "Sorry, I'm having trouble answering right now.";

  if (!apiKey) {
    aiReply =
      "Sorry, my brain is not configured yet. Please try again later or contact us another way.";
  } else {
    try {
      const prompt = `
You are a friendly, concise phone receptionist for a small business.
The caller just said: "${userText}".
Answer in a natural phone style, in one or two short sentences.
Do not mention that you are an AI or a language model.
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

  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US">
    ${aiReply}
  </Say>
  <Hangup/>
</Response>`;

  res.setHeader("Content-Type", "text/xml");
  return res.status(200).send(twimlResponse);
}
