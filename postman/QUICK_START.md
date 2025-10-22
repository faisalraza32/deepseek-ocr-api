# 🚀 Quick Start Guide - Postman Collection

## Step-by-Step Import Instructions

### 1️⃣ Open Postman

Download Postman if you don't have it: [https://www.postman.com/downloads/](https://www.postman.com/downloads/)

### 2️⃣ Import Collection

**Method A: Drag & Drop (Easiest)**

```
1. Open Postman
2. Drag all 3 JSON files from this folder into Postman
3. Done! ✅
```

**Method B: Using Import Button**

```
1. Click "Import" button (top-left)
2. Click "Choose Files"
3. Select all 3 JSON files:
   ✓ DeepSeek-OCR-API.postman_collection.json
   ✓ Local.postman_environment.json
   ✓ Production.postman_environment.json
4. Click "Import"
5. Done! ✅
```

### 3️⃣ Select Environment

In the top-right corner of Postman:

```
1. Click the dropdown (says "No Environment")
2. Select "Local Development"
3. Done! ✅
```

### 4️⃣ Make Your First Request

```
1. Expand "DeepSeek-OCR API" collection
2. Expand "Health" folder
3. Click "Health Check"
4. Click "Send" button
5. You should see: {"status": "ok", ...} ✅
```

### 5️⃣ Test File Upload

```
1. Start your server: npm run start:dev
2. In Postman, go to: OCR > Extract Single Document
3. Click "Body" tab
4. Click "Select Files" next to "file" field
5. Choose an image or PDF file
6. Click "Send"
7. View extracted data! 🎉
```

## 📊 Collection Overview

```
DeepSeek-OCR API
├── OCR
│   ├── Extract Single Document
│   ├── Extract Single Document with Type Hint
│   ├── Extract Batch Documents
│   └── Get Supported Formats
├── Health
│   └── Health Check
└── Error Examples
    ├── No File Uploaded
    └── Invalid File Type
```

## 🎯 What's Included

### ✅ All API Endpoints

- Single file extraction
- Batch file processing
- Health checks
- Supported formats info

### ✅ Automated Tests

Every request includes tests that automatically verify:

- Response status codes
- Response structure
- Data validation
- Performance (response time)

### ✅ Example Responses

Pre-saved examples for:

- Invoice extraction
- Receipt extraction
- Batch processing
- Error scenarios

### ✅ Two Environments

- **Local Development** - http://localhost:3000
- **Production** - Configure with your production URL

## 🧪 Running Tests

### Test Single Request

1. Select any request
2. Click "Send"
3. Click "Test Results" tab
4. See all tests passing ✅

### Test Entire Collection

1. Click on collection name
2. Click "Run" button
3. Select requests to run
4. Click "Run DeepSeek-OCR API"
5. View comprehensive test report

## 💡 Pro Tips

### Save Your Own Examples

After a successful request:

```
1. Click "Save Response"
2. Select "Save as example"
3. Add description
4. Click "Save"
```

### Use Variables

The collection uses `{{baseUrl}}` variable:

```javascript
// In Pre-request Script or Tests
pm.environment.set('baseUrl', 'http://localhost:3000');
```

### Add Authorization (if needed)

```
1. Click collection name
2. Go to "Authorization" tab
3. Select type (Bearer Token, API Key, etc.)
4. Configure
5. All requests inherit this
```

### Export Results

After running collection:

```
1. Click "Export Results"
2. Choose format (JSON/HTML)
3. Share with team
```

## 🔧 Environment Variables

### Current Variables

| Variable    | Local Value           | Production Value            |
| ----------- | --------------------- | --------------------------- |
| baseUrl     | http://localhost:3000 | https://api.yourcompany.com |
| environment | local                 | production                  |

### Add New Variables

```
1. Click environment name
2. Click "Edit"
3. Add new variable
4. Save
```

### Use in Requests

```
{{baseUrl}}/ocr/extract
{{environment}}
```

## 📝 Common Use Cases

### 1. Test Invoice Processing

```
Request: Extract Single Document
Query Param: ?documentType=invoice
File: Upload invoice.pdf
Expected: Invoice schema with vendor, items, total
```

### 2. Batch Process Multiple Files

```
Request: Extract Batch Documents
Files: Upload 3-10 files
Expected: Array of results with success/failure counts
```

### 3. Check Service Health

```
Request: Health Check
Expected: Status "ok", modelAvailable: true
```

### 4. Get API Capabilities

```
Request: Get Supported Formats
Expected: List of formats, document types, examples
```

## 🐛 Troubleshooting

### Server Not Running?

```bash
cd /path/to/project
npm run start:dev
```

### Wrong Environment?

Check the dropdown in top-right is set to "Local Development"

### File Upload Not Working?

- Max file size: 10MB
- Supported formats: jpg, jpeg, png, pdf
- File must not be corrupted

### Tests Failing?

- Check server is running: GET /ocr/health
- Verify response structure matches expectations
- Review server logs for errors

## 🎓 Learn More

- [Full Documentation](./README.md)
- [API Docs (Swagger)](http://localhost:3000/api/docs)
- [Main Project README](../README.md)

## 🌟 Next Steps

1. ✅ Import collection
2. ✅ Test health check
3. ✅ Upload your first document
4. ✅ Try batch processing
5. ✅ Run all tests
6. 🚀 Integrate with your app!

---

**Need help?** Check the [detailed README](./README.md) or review the [API documentation](http://localhost:3000/api/docs)

Happy testing! 🎉
