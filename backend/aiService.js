const { GoogleGenerativeAI } = require("@google/generative-ai");

async function generatePostContent(topic, context, size, tone, postCount = 1) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log("[AI] No GEMINI_API_KEY found in aiService. Returning mock.");
    const contents = [];
    for(let i=0; i<postCount; i++) {
      contents.push(`[Mock Automated Post] Insights on ${topic} based on ${context.substring(0, 20)}... \n\n#${topic.replace(/\s+/g,'')} #Automated #Growth`);
    }
    return contents;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  let prompt = `Write ${postCount} highly engaging, distinct LinkedIn post(s) about "${topic}".\n`;

  if (context && context.trim() !== '') {
    prompt += `\nThe author's professional context/background is: "${context}". Please weave this personal perspective and industry experience into the post organically. You may mention the author's professional title or role, but DO NOT repeatedly name-drop the author's company name. Mention the company name at most once, or preferably speak from the perspective of an insider without explicitly stating the company name at all.\n`;
  }

  prompt += `
Focus specifically on the current, ongoing market situation and recent trends regarding this topic. The content MUST feel fresh, highly relevant to today's industry climate, and offer unique insights rather than generic advice.

Tone Requirements: ${tone} (If Professional, be authoritative. If Casual, use conversational language. If Thought Leadership, be contrarian and visionary).
Length Requirements: ${size} (If Short, strictly 1-2 brief paragraphs. If Medium, strictly 3-4 paragraphs. If Long, strictly 5-7 paragraphs with deep insights and structural formatting like lists).

CRITICAL RULE 1: DO NOT use the long em-dash character (—) or en-dash (–) anywhere in your response under any circumstances. If you need to separate clauses or break a sentence, use commas, periods, or a standard short hyphen (-).

CRITICAL RULE 2: If the Tone is "Professional" or "Thought Leadership", you are STRICTLY FORBIDDEN from using ANY emojis anywhere in the response. No exceptions. If the Tone is "Casual", you MAY use emojis. The current Tone for this request is "${tone}".

Include 2-3 relevant hashtags at the bottom of each post. Do not wrap the response in quotes or include any preamble.`;

  if (postCount > 1) {
    prompt += `\nCRITICAL: You are writing MULTIPLE posts. You MUST separate each distinct post exactly with this string on its own line: ---POST_SEPARATOR---. Make sure each post tackles a slightly different angle or perspective of the topic so they are distinct.`;
  }

  let generatedContent = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      generatedContent = result.response.text().trim();
      break;
    } catch (err) {
      if (err.status === 503 || (err.message && err.message.includes('503'))) {
        console.warn(`[AI] Gemini 503 error on attempt ${attempt}. Retrying...`);
        if (attempt === 3) {
          console.error("[AI] Gemini failed 3 times. Returning fallback.");
          generatedContent = `[Fallback Post] Our AI is currently experiencing high demand. But here's an insight on ${topic} based on your background in ${context}. \n\n#${topic.replace(/\\s+/g, '')} #Automated #Growth`;
          if (postCount > 1) {
            generatedContent = Array(postCount).fill(generatedContent).join('\\n---POST_SEPARATOR---\\n');
          }
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      } else {
        console.error("AI Generation Error:", err);
        throw err;
      }
    }
  }

  let contents = [generatedContent];
  if (postCount > 1) {
    contents = generatedContent.split('---POST_SEPARATOR---').map(c => c.trim()).filter(c => c);
  }

  return contents;
}

module.exports = { generatePostContent };
