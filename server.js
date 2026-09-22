require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');

// Polyfills for pdf-parse on Node 22
global.DOMMatrix = class DOMMatrix {};
global.ImageData = class ImageData {};
global.Path2D = class Path2D {};
const pdfParse = require('pdf-parse');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Setup Multer for memory storage (no need to save files to disk)
const upload = multer({ storage: multer.memoryStorage() });

// Connect to MongoDB (Optional, will connect if URI is provided)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('No MONGODB_URI provided in .env. Skipping DB connection.');
}

// Define a simple Schema for saved quizzes (Optional feature)
const quizSchema = new mongoose.Schema({
  title: String,
  questions: Array,
  createdAt: { type: Date, default: Date.now }
});
const Quiz = mongoose.model('Quiz', quizSchema);

let lastError = null;

// The Main Route
app.post('/api/generate-quiz', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // 1. Extract text from PDF
    console.log('Extracting text from PDF...');
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the PDF. It might be empty or scanned.' });
    }

    console.log(`Extracted ${extractedText.length} characters of text.`);

    // 2. Split text into chunks (approx 30,000 chars per chunk to avoid output limits)
    const chunkSize = 30000;
    const chunks = [];
    for (let i = 0; i < extractedText.length; i += chunkSize) {
      chunks.push(extractedText.substring(i, i + chunkSize));
    }
    
    console.log(`Processing ${chunks.length} chunk(s) to Gemini API...`);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    let allQuestions = [];
    let questionIdCounter = 1;

    // 3. Process each chunk sequentially to avoid rate limits
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Generating questions for chunk ${i + 1}/${chunks.length}...`);
      
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
${chunks[i]}
-----------------------
      `;

      try {
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        let cleanJsonStr = responseText.trim();
        if (cleanJsonStr.startsWith('```json')) {
          cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanJsonStr.startsWith('```')) {
          cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const chunkQuestions = JSON.parse(cleanJsonStr);
        if (Array.isArray(chunkQuestions)) {
          allQuestions = allQuestions.concat(chunkQuestions);
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${i+1}:`, chunkError.message);
        // We continue to the next chunk even if one fails
      }
    }

    // Assign sequential IDs
    allQuestions = allQuestions.map((q) => {
      return { id: questionIdCounter++, ...q };
    });

    console.log(`Successfully generated total ${allQuestions.length} questions.`);

    // 4. Send back to frontend
    res.json(allQuestions);

  } catch (error) {
    lastError = { message: error.message, stack: error.stack, time: new Date() };
    console.error('Error in /api/generate-quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz', details: error.message, stack: error.stack });
  }
});

app.get('/api/logs', (req, res) => {
  res.json({ lastError });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
