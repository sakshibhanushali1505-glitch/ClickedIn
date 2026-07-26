require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent("Hello!");
    console.log("Success with gemini-3.5-flash:", result.response.text());
  } catch (err) {
    console.error("Error with gemini-3.5-flash:", err.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Hello!");
    console.log("Success with gemini-flash-latest:", result.response.text());
  } catch (err) {
    console.error("Error with gemini-flash-latest:", err.message);
  }
}

run();
