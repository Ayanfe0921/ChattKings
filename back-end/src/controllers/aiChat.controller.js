import AIChat from "../models/aiChat.model.js";

const MAX_MESSAGE_LENGTH = 4000;

export async function getAIChat(req, res) {
  try {
    const chat = await AIChat.findOne({ userId: req.user._id }).select("messages").lean();
    res.status(200).json(chat?.messages || []);
  } catch (error) {
    console.error("Could not load Codex chat:", error);
    res.status(500).json({ message: "Could not load AI chat" });
  }
}

export async function sendAIMessage(req, res) {
  const userText = String(req.body.message || "").trim();
  if (!userText || userText.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `Messages must be 1–${MAX_MESSAGE_LENGTH} characters` });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ message: "Codex AI is not configured yet. Add OPENAI_API_KEY to the backend environment." });
  }

  try {
    const chat = await AIChat.findOne({ userId: req.user._id }).select("messages");
    const history = (chat?.messages || []).slice(-20).map(({ role, content }) => ({ role, content }));
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.3-codex",
        instructions: "You are Codex, the helpful AI assistant inside ChattKings. Be clear, friendly, and concise. Help with everyday questions and coding. Do not claim access to the user's files or account unless provided in the conversation.",
        input: [...history, { role: "user", content: userText }],
        max_output_tokens: 1200,
        reasoning: { effort: "low" },
        store: false,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("OpenAI Responses API error:", result.error?.message || response.status);
      return res.status(502).json({ message: "Codex AI could not reply right now" });
    }
    const answer = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!answer) return res.status(502).json({ message: "Codex AI returned an empty response" });

    const messages = [
      { role: "user", content: userText, createdAt: new Date() },
      { role: "assistant", content: answer, createdAt: new Date() },
    ];
    const updated = await AIChat.findOneAndUpdate(
      { userId: req.user._id },
      { $push: { messages: { $each: messages, $slice: -100 } } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.status(200).json(updated.messages.slice(-2));
  } catch (error) {
    console.error("Could not send Codex chat message:", error);
    res.status(500).json({ message: "Could not send AI chat message" });
  }
}

export async function clearAIChat(req, res) {
  try {
    await AIChat.deleteOne({ userId: req.user._id });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Could not clear Codex chat:", error);
    res.status(500).json({ message: "Could not clear AI chat" });
  }
}
