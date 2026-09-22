const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch') || fetch;

async function testApi() {
  try {
    // Create a dummy PDF file buffer (just a text string for testing if pdf-parse rejects or gemini rejects)
    // Actually let's use a real PDF to make sure pdf-parse doesn't throw on invalid format.
    const pdfPath = 'C:/Users/HP/OneDrive/Desktop/QuizApp/backend/test.pdf';
    
    // We don't have a PDF easily, let's just make a text file and rename to .pdf, pdf-parse will probably fail with InvalidPDFException
    
    const form = new FormData();
    form.append('pdf', fs.createReadStream('C:/Users/HP/OneDrive/Desktop/QuizApp/backend/package.json')); // Sending package.json as a file just to see if it reaches the handler

    const response = await fetch('https://quiz-api-9iji.onrender.com/api/generate-quiz', {
      method: 'POST',
      body: form
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', text);
  } catch(e) {
    console.error(e);
  }
}
testApi();
