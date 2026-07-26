const { OpenAI } = require("openai");

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateLinkedInPost(topic, size, tone) {
  const prompt = `
    You are an expert LinkedIn ghostwriter. Write a LinkedIn post about "${topic}".
    The desired length is ${size} (e.g., Short/Punchy, Medium/Story-driven, Long-form/Educational).
    The tone should be ${tone}.
    
    CRITICAL INSTRUCTIONS TO PREVENT ALGORITHMIC SUPPRESSION:
    - Avoid overly robotic buzzwords (e.g., "In today's fast-paced world", "Unlock the power of").
    - Use conversational, human-like language.
    - Format with natural line breaks and short paragraphs to make it highly readable.
    - Do not use excessive hashtags; limit to 3 highly relevant ones.
    - Conclude with a thought-provoking question to encourage organic engagement.
  `;

  try {
    /*
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return response.choices[0].message.content;
    */
    
    // Mock response for demo
    return `Let's talk about ${topic}.\n\nI've noticed a recurring pattern recently. People often overlook the fundamentals when trying to scale.\n\nHere's the reality: mastering the basics is what sets the top 1% apart.\n\nFocus on ${tone} communication, stay consistent, and watch the results compound.\n\nWhat's one fundamental habit you refuse to compromise on? 👇\n\n#Growth #Leadership #${topic.replace(/\s+/g, '')}`;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate content");
  }
}

module.exports = { generateLinkedInPost };
