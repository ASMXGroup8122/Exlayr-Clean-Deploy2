// Simple test script to check upload API
// Run with: node test-upload-api.js

const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUploadAPI() {
  try {
    console.log('Testing upload API...');
    
    // Create a simple test file
    const testContent = 'This is a test PDF content';
    fs.writeFileSync('test.pdf', testContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test.pdf'));
    formData.append('category', 'accounts');
    formData.append('organizationId', 'test-org-id');
    
    console.log('Making request to upload API...');
    
    const response = await fetch('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    // Clean up
    fs.unlinkSync('test.pdf');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUploadAPI(); 