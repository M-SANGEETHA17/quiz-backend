require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const prompt = `
You are an expert educational AI. I will provide you with a chunk of text extracted from a large PDF.
Your task is to identify and extract multiple-choice questions (with their options and correct answers) from this text.
If the text does not contain explicit options, generate 4 plausible options based on the context, with one correct answer.
If this chunk has NO questions or educational content, just return an empty array [].

CRITICAL INSTRUCTION:
You MUST respond ONLY with a valid JSON array of objects. Do NOT wrap the JSON in Markdown code blocks (\`\`\`json). Do NOT add any conversational text.

Expected JSON format:
[
  {
    "question": "The actual question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B"
  }
]

Here is the extracted text chunk:
-----------------------
A dummy PDF file
-----------------------
      `;

  try {
    const result = await model.generateContent(prompt);
    console.log(await result.response.text());
  } catch(e) {
    console.error(e);
  }
}
testGemini();
