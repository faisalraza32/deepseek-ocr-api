# DeepSeek-OCR API

A powerful NestJS-based API for extracting structured data from documents and images using DeepSeek-OCR. Automatically detects document types (invoices, receipts, forms, tables) and returns structured JSON schemas.

## Features

- 🚀 **Dual Mode Operation**: Support for both local model inference and API service
- 📄 **Multi-Format Support**: Process images (JPG, PNG) and PDFs
- 🤖 **Automatic Detection**: Intelligent document type detection
- 📊 **Structured Output**: Returns JSON schemas tailored to document type
- 🔄 **Batch Processing**: Process multiple documents simultaneously
- 📚 **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- 🛡️ **Type-Safe**: Built with TypeScript for better reliability
- ⚡ **Async Processing**: High-performance asynchronous operations

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
  - [Postman Collection](#postman-collection-)
  - [JavaScript/TypeScript](#javascripttypescript-using-fetch)
  - [cURL Examples](#curl)
  - [Python Example](#python)
- [Supported Document Types](#supported-document-types)
- [Development](#development)
- [Testing](#testing)
  - [Test Coverage](#test-coverage)
  - [Running Tests](#running-tests)
- [Contributing](#contributing)

## Prerequisites

### Required

- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Optional (for local model mode)

- **Python** 3.12.9 or higher
- **PyTorch** with CUDA support (for GPU acceleration)
- **DeepSeek-OCR** model dependencies

### System Dependencies (for PDF processing)

- **poppler-utils** (for pdftoppm)
  - Ubuntu/Debian: `sudo apt-get install poppler-utils`
  - macOS: `brew install poppler`
  - Windows: Download from [poppler releases](https://github.com/oschwaldp/poppler-windows/releases)

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd deekseek
```

2. **Install Node.js dependencies**

```bash
npm install
# or
yarn install
```

3. **Setup environment variables**

```bash
cp .env.example .env
```

Edit `.env` file with your configuration (see [Configuration](#configuration) section).

4. **For Local Mode: Install Python dependencies**

If using local model inference, you'll need to set up the Python environment:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install PyTorch (CUDA 11.8)
pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu118

# Install transformers and dependencies
pip install transformers accelerate sentencepiece protobuf

# Install DeepSeek-OCR dependencies
pip install flash-attn --no-build-isolation
```

## Configuration

Edit the `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000

# OCR Configuration
OCR_MODE=local
# Options: 'local' (use local model) or 'api' (use DeepSeek API service)

# DeepSeek API Configuration (required when OCR_MODE=api)
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/ocr

# File Upload Configuration
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf

# Storage Configuration
TEMP_DIR=./temp

# Python Configuration (required when OCR_MODE=local)
PYTHON_PATH=python3
DEEPSEEK_MODEL_PATH=deepseek-ai/DeepSeek-OCR
```

## Running the Application

### Development Mode

```bash
npm run start:dev
# or
yarn start:dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Using Docker (Optional)

```bash
docker build -t deepseek-ocr-api .
docker run -p 3000:3000 --env-file .env deepseek-ocr-api
```

The API will be available at:

- **Base URL**: `http://localhost:3000`
- **Swagger UI**: `http://localhost:3000/api/docs`
- **Swagger JSON**: `http://localhost:3000/api/docs-json`

## API Endpoints

### 1. Extract from Single Document

**POST** `/ocr/extract`

Upload a single image or PDF to extract structured data.

**Query Parameters:**

- `documentType` (optional): Hint about document type (`invoice`, `receipt`, `form`, `table`)

**Request:**

```bash
curl -X POST http://localhost:3000/ocr/extract \
  -F "file=@/path/to/document.pdf"
```

**Response:**

```json
{
  "filename": "invoice.pdf",
  "documentType": "invoice",
  "confidence": 0.92,
  "schema": {
    "vendor": "Acme Corporation",
    "invoiceNumber": "INV-2024-001",
    "date": "2024-01-15",
    "items": [
      {
        "description": "Product A",
        "quantity": 2,
        "unitPrice": 50.0,
        "total": 100.0
      }
    ],
    "subtotal": 100.0,
    "tax": 10.0,
    "total": 110.0,
    "currency": "USD"
  },
  "rawText": "..."
}
```

### 2. Batch Extract from Multiple Documents

**POST** `/ocr/extract/batch`

Upload multiple files for batch processing.

**Request:**

```bash
curl -X POST http://localhost:3000/ocr/extract/batch \
  -F "files=@/path/to/doc1.pdf" \
  -F "files=@/path/to/doc2.jpg"
```

**Response:**

```json
{
  "results": [
    { "filename": "doc1.pdf", "documentType": "invoice", "schema": {...} },
    { "filename": "doc2.jpg", "documentType": "receipt", "schema": {...} }
  ],
  "totalProcessed": 2,
  "successful": 2,
  "failed": 0
}
```

### 3. Health Check

**GET** `/ocr/health`

Check service status and model availability.

**Response:**

```json
{
  "status": "ok",
  "ocrMode": "local",
  "modelAvailable": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Supported Formats

**GET** `/ocr/supported-formats`

Get information about supported formats and example schemas.

**Response:**

```json
{
  "supportedFileTypes": ["jpg", "jpeg", "png", "pdf"],
  "supportedDocumentTypes": ["invoice", "receipt", "form", "table"],
  "maxFileSizeMB": 10,
  "exampleSchemas": {...}
}
```

## Usage Examples

### Postman Collection 📮

A complete Postman collection is available in the `/postman` directory with:

- All API endpoints with examples
- Automated tests for each request
- Environment configurations (Local & Production)
- Error handling examples

**Quick Start:**

1. Import `postman/DeepSeek-OCR-API.postman_collection.json` into Postman
2. Import `postman/Local.postman_environment.json` for local testing
3. Select "Local Development" environment
4. Start testing!

See [postman/README.md](./postman/README.md) for detailed instructions.

### JavaScript/TypeScript (using fetch)

```typescript
// Single file upload
async function extractDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/ocr/extract', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  console.log(result);
}

// With document type hint
async function extractInvoice(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/ocr/extract?documentType=invoice', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}
```

### Python (using requests)

```python
import requests

# Single file upload
def extract_document(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post('http://localhost:3000/ocr/extract', files=files)
        return response.json()

# Batch upload
def extract_multiple(file_paths):
    files = [('files', open(path, 'rb')) for path in file_paths]
    response = requests.post('http://localhost:3000/ocr/extract/batch', files=files)
    return response.json()
```

### cURL

```bash
# Extract from image
curl -X POST http://localhost:3000/ocr/extract \
  -F "file=@receipt.jpg"

# Extract from PDF with type hint
curl -X POST "http://localhost:3000/ocr/extract?documentType=invoice" \
  -F "file=@invoice.pdf"

# Batch processing
curl -X POST http://localhost:3000/ocr/extract/batch \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.jpg" \
  -F "files=@doc3.png"

# Health check
curl http://localhost:3000/ocr/health

# Get supported formats
curl http://localhost:3000/ocr/supported-formats
```

## Supported Document Types

### 1. Invoice

Extracts vendor information, line items, totals, tax, and dates.

**Schema:**

```typescript
{
  vendor: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  items: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  subtotal?: number;
  tax?: number;
  total: number;
  currency?: string;
}
```

### 2. Receipt

Extracts merchant, transaction details, and purchased items.

**Schema:**

```typescript
{
  merchant: string;
  date?: string;
  items: Array<{
    name: string;
    quantity?: number;
    price?: number;
  }>;
  total: number;
  transactionId?: string;
  paymentMethod?: string;
}
```

### 3. Form

Extracts field-value pairs from forms.

**Schema:**

```typescript
{
  fields: Record<string, string>;
}
```

### 4. Table

Extracts structured table data with headers and rows.

**Schema:**

```typescript
{
  headers: string[];
  rows: string[][];
}
```

## Development

### Project Structure

```
deekseek/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── common/                 # Shared utilities
│   │   ├── filters/
│   │   └── interceptors/
│   ├── config/                 # Configuration
│   ├── ocr/                    # OCR module
│   │   ├── ocr.controller.ts
│   │   ├── ocr.service.ts
│   │   ├── providers/          # Local & API providers
│   │   ├── dto/                # Data transfer objects
│   │   └── interfaces/
│   ├── document/               # Document processing
│   │   └── services/
│   └── storage/                # File storage
├── test/                       # Tests
├── package.json
└── tsconfig.json
```

### Available Scripts

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Tests
npm run test
npm run test:watch
npm run test:cov

# Linting
npm run lint
```

## Testing

This project has comprehensive unit test coverage with **87.67% code coverage** and **77 passing tests**.

### Test Coverage

| Metric     | Coverage | Status |
| ---------- | -------- | ------ |
| Statements | 87.67%   | ✅     |
| Branches   | 72.72%   | ✅     |
| Functions  | 77.63%   | ✅     |
| Lines      | 87.45%   | ✅     |

See [TEST_COVERAGE.md](./TEST_COVERAGE.md) for detailed coverage report.

### Running Tests

```bash
# Run all unit tests
npm run test

# Run tests with coverage report
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- ocr.controller.spec
```

### Test Files

- ✅ `ocr.controller.spec.ts` - Controller endpoint tests
- ✅ `ocr.service.spec.ts` - Business logic tests
- ✅ `storage.service.spec.ts` - File storage tests
- ✅ `document-detector.service.spec.ts` - Document type detection tests
- ✅ `pdf-processor.service.spec.ts` - PDF processing tests
- ✅ `schema-extractor.service.spec.ts` - Schema extraction tests
- ✅ `http-exception.filter.spec.ts` - Error handling tests
- ✅ `logging.interceptor.spec.ts` - Logging tests

**Total: 77 tests across 8 test suites**

### Coverage Report

After running `npm run test:cov`, view the HTML coverage report:

```bash
open coverage/lcov-report/index.html
```

## Troubleshooting

### Common Issues

1. **PDF conversion fails**
   - Ensure poppler-utils is installed
   - Check if pdftoppm is in your PATH

2. **Python model not loading**
   - Verify Python path in .env
   - Check CUDA availability for GPU support
   - Ensure all Python dependencies are installed

3. **API rate limits**
   - When using API mode, check your API key and quota
   - Consider switching to local mode for unlimited usage

4. **File upload errors**
   - Check MAX_FILE_SIZE_MB in .env
   - Verify file type is in ALLOWED_FILE_TYPES

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
