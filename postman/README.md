# DeepSeek-OCR API - Postman Collection

This directory contains Postman collection and environment files for testing the DeepSeek-OCR API.

## 📁 Files

- **DeepSeek-OCR-API.postman_collection.json** - Main API collection with all endpoints
- **Local.postman_environment.json** - Local development environment (localhost:3000)
- **Production.postman_environment.json** - Production environment (update with your production URL)

## 🚀 Quick Start

### Option 1: Import via Postman App

1. Open Postman desktop application
2. Click **Import** button in the top-left corner
3. Drag and drop all JSON files from this folder OR click **Choose Files**
4. Select all three files:
   - `DeepSeek-OCR-API.postman_collection.json`
   - `Local.postman_environment.json`
   - `Production.postman_environment.json`
5. Click **Import**
6. Select the **Local Development** environment from the dropdown in the top-right
7. Start testing! 🎉

### Option 2: Import via URL (if hosted)

1. Open Postman
2. Click **Import** > **Link**
3. Paste the URL to the collection file
4. Click **Continue** > **Import**

## 📋 Collection Structure

### 1. OCR Endpoints

#### Extract Single Document

- **POST** `/ocr/extract`
- Upload a single image or PDF file
- Optional: Add `?documentType=invoice` query parameter to hint the document type
- Returns structured data based on detected document type

#### Extract Batch Documents

- **POST** `/ocr/extract/batch`
- Upload up to 10 files at once
- Processes files in parallel
- Returns results for all files with success/failure counts

#### Get Supported Formats

- **GET** `/ocr/supported-formats`
- Returns supported file types and document types
- Provides example schemas for each document type
- Shows maximum file size allowed

### 2. Health Check

#### Health Check

- **GET** `/ocr/health`
- Check if the service is running
- Verify OCR model availability
- Returns status: `ok`, `degraded`, or `error`

### 3. Error Examples

Example requests that demonstrate error handling:

- No file uploaded
- Invalid file type
- File too large

## 🧪 Automated Tests

Each request includes automated tests that verify:

### Global Tests (All Requests)

- ✅ Response time is under 30 seconds
- ✅ Content-Type is application/json

### Extract Endpoint Tests

- ✅ Status code is 200
- ✅ Response has all required fields (filename, documentType, confidence, schema, rawText)
- ✅ Confidence score is between 0 and 1
- ✅ Document type is valid (invoice, receipt, form, table, unknown)

### Batch Extract Tests

- ✅ Response has batch-specific fields (results, totalProcessed, successful, failed)
- ✅ Results array is not empty
- ✅ Total processed equals successful + failed

### Health Check Tests

- ✅ Service status is valid (ok, degraded, or error)
- ✅ All required fields present
- ✅ Timestamp is in valid ISO format

### Supported Formats Tests

- ✅ Response includes supported file types
- ✅ Common formats (pdf, jpg) are included

## 🔧 Environment Variables

### Local Development

```
baseUrl: http://localhost:3000
environment: local
```

### Production

```
baseUrl: https://api.yourcompany.com
environment: production
```

**Note:** Update the production baseUrl with your actual production server URL.

## 📝 How to Use

### Testing Single File Upload

1. Select **"Extract Single Document"** request
2. Click on **Body** tab
3. Hover over the **file** field
4. Click **Select Files**
5. Choose an image or PDF file (max 10MB)
6. Click **Send**
7. View the extracted structured data in the response

### Testing with Document Type Hint

1. Select **"Extract Single Document with Type Hint"** request
2. In the **Params** tab, change `documentType` to one of:
   - `invoice`
   - `receipt`
   - `form`
   - `table`
3. Upload your file
4. Click **Send**

### Testing Batch Processing

1. Select **"Extract Batch Documents"** request
2. Click on **Body** tab
3. For each `files` field:
   - Click **Select Files**
   - Choose a different file
4. You can add up to 10 files total
5. Click **Send**
6. View results for all files in the response

## 🎯 Tips

### Running All Tests

1. Click on the collection name
2. Click **Run** button
3. Select all requests you want to run
4. Click **Run DeepSeek-OCR API**
5. View test results for all endpoints

### Saving Example Files

After a successful request:

1. Click **Save Response**
2. Select **Save as example**
3. This helps document API behavior

### Using Variables

The collection uses variables for the base URL:

- Change environment to switch between local and production
- Or modify `{{baseUrl}}` in any request to use a different server

### Collection Runner

Use the Collection Runner for:

- Running all tests in sequence
- Testing with different data files
- Performance testing
- Generating test reports

## 📊 Response Examples

### Invoice Response

```json
{
  "filename": "invoice.pdf",
  "documentType": "invoice",
  "confidence": 0.95,
  "schema": {
    "vendor": "Acme Corporation",
    "invoiceNumber": "INV-2024-001",
    "date": "2024-01-15",
    "items": [...],
    "total": 110
  },
  "rawText": "..."
}
```

### Receipt Response

```json
{
  "filename": "receipt.jpg",
  "documentType": "receipt",
  "confidence": 0.92,
  "schema": {
    "merchant": "Corner Store",
    "date": "2024-01-15",
    "items": [...],
    "total": 45.99
  },
  "rawText": "..."
}
```

## 🐛 Troubleshooting

### "Could not send request" Error

- Make sure the server is running: `npm run start:dev`
- Check that the port 3000 is not blocked
- Verify the `baseUrl` environment variable is correct

### File Upload Fails

- Ensure file is under 10MB
- Use supported formats: jpg, jpeg, png, pdf
- Check file is not corrupted

### Tests Failing

- Check server logs for errors
- Verify the API is returning the expected response structure
- Update test expectations if API schema has changed

## 🔗 Related Documentation

- [Main README](../README.md) - Project overview
- [API Documentation](http://localhost:3000/api/docs) - Swagger/OpenAPI docs
- [Configuration Guide](../CONFIGURATION.md) - Development setup

## 📞 Support

If you encounter issues:

1. Check the API is running: `GET /ocr/health`
2. Review server logs for errors
3. Verify file format and size requirements
4. Check the Swagger documentation for detailed API specs

---

Happy Testing! 🚀
