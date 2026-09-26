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
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.3-codex";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: "You are Codex, the helpful AI assistant inside ChattKings. Be clear, friendly, and concise. Help with everyday questions and coding. Do not claim access to the user's files or account unless provided in the conversation.",
        input: [...history, { role: "user", content: userText }],
        max_output_tokens: 1200,
        reasoning: { effort: "low" },
        store: false,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = result.error?.message || `OpenAI returned HTTP ${response.status}`;
      const providerCode = result.error?.code || result.error?.type;
      console.error("OpenAI Responses API error:", {
        status: response.status,
        code: providerCode,
        requestId: response.headers.get("x-request-id"),
        model,
        message: providerMessage,
      });
      return res.status(502).json({
        message: `Codex could not reply: ${providerMessage}`,
        code: providerCode,
        upstreamStatus: response.status,
      });
    }
    const answer = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!answer) {
      const reason = result.incomplete_details?.reason || result.status || "unknown";
      console.error("OpenAI Responses API returned no text:", { model, status: result.status, reason, id: result.id });
      return res.status(502).json({ message: `Codex returned no text (response status: ${reason})` });
    }

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
