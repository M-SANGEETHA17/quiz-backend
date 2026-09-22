const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { PDFDocument } = require('pdf-lib');

async function testApi() {
  try {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    page.drawText('What is the capital of France? A) Paris B) London C) Rome D) Berlin\nAnswer: A')
    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync('C:/Users/HP/OneDrive/Desktop/QuizApp/backend/dummy.pdf', pdfBytes);
    
    const form = new FormData();
    form.append('pdf', fs.createReadStream('C:/Users/HP/OneDrive/Desktop/QuizApp/backend/test2.pdf')); 

    console.log('Sending real PDF to Render API...');
    const response = await fetch('http://localhost:5000/api/generate-quiz', {
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
