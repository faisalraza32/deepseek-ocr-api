/**
 * Simple test script to verify the DeepSeek-OCR API is working
 * Run with: node examples/test-api.js
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test 1: Health Check
function testHealth() {
  return new Promise((resolve, reject) => {
    http.get(`${API_URL}/ocr/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✓ Health Check:', result.status);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Test 2: Supported Formats
function testSupportedFormats() {
  return new Promise((resolve, reject) => {
    http.get(`${API_URL}/ocr/supported-formats`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✓ Supported File Types:', result.supportedFileTypes.join(', '));
          console.log('✓ Supported Document Types:', result.supportedDocumentTypes.join(', '));
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Test 3: Swagger JSON
function testSwaggerJson() {
  return new Promise((resolve, reject) => {
    http.get(`${API_URL}/api/docs-json`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✓ Swagger JSON Available');
          console.log('  - Title:', result.info.title);
          console.log('  - Version:', result.info.version);
          console.log('  - Paths:', Object.keys(result.paths).length, 'endpoints');
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Run all tests
async function runTests() {
  console.log('\n🧪 Testing DeepSeek-OCR API...\n');
  console.log(`API URL: ${API_URL}\n`);

  try {
    await testHealth();
    await testSupportedFormats();
    await testSwaggerJson();
    
    console.log('\n✅ All tests passed!\n');
    console.log('Next steps:');
    console.log(`  - View API documentation: ${API_URL}/api/docs`);
    console.log(`  - Download Swagger JSON: ${API_URL}/api/docs-json`);
    console.log('  - Upload a file using curl or Postman to /ocr/extract\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure the API server is running:');
    console.error('  npm run start:dev\n');
    process.exit(1);
  }
}

runTests();

