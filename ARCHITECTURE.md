# DeepSeek-OCR API Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Browser, cURL, Postman, Mobile App, Web App)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     API Gateway Layer                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            NestJS Application (main.ts)                   │  │
│  │  • CORS                                                   │  │
│  │  • Global Validation Pipe                                │  │
│  │  • Global Exception Filter                               │  │
│  │  • Swagger Documentation (/api/docs, /api/docs-json)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   Controller Layer                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              OCR Controller                               │  │
│  │  • POST /ocr/extract                                      │  │
│  │  • POST /ocr/extract/batch                                │  │
│  │  • GET  /ocr/health                                       │  │
│  │  • GET  /ocr/supported-formats                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Service Layer                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   OCR Service                             │  │
│  │  • Orchestrates extraction pipeline                       │  │
│  │  • Manages provider selection (local/API)                │  │
│  │  • Handles file processing workflow                       │  │
│  └───┬──────────────────────────────────────────────────────┘  │
│      │                                                          │
│      │                                                          │
│  ┌───▼────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │   Storage Service  │  │ Document Module  │  │ Config     │ │
│  │  • File validation │  │  Services:       │  │ Service    │ │
│  │  • Temp storage    │  │  • PDF Proc.     │  │            │ │
│  │  • Cleanup         │  │  • Doc Detector  │  │            │ │
│  └────────────────────┘  │  • Schema Extr.  │  └────────────┘ │
│                          └──────────────────┘                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   Provider Layer                                 │
│                                                                  │
│  ┌─────────────────────────┐    ┌──────────────────────────┐   │
│  │   Local OCR Provider    │    │    API OCR Provider      │   │
│  │  • Python bridge        │    │  • HTTP client           │   │
│  │  • child_process spawn  │    │  • DeepSeek API calls    │   │
│  │  • Model inference      │    │  • Authentication        │   │
│  └───────┬─────────────────┘    └────────┬─────────────────┘   │
│          │                                │                     │
└──────────┼────────────────────────────────┼─────────────────────┘
           │                                │
           │                                │
┌──────────▼────────────────┐    ┌─────────▼──────────────────┐
│  Python DeepSeek-OCR      │    │  DeepSeek API Service      │
│  • transformers library   │    │  (External Service)        │
│  • PyTorch inference      │    │                            │
│  • Local GPU/CPU          │    │                            │
└───────────────────────────┘    └────────────────────────────┘
```

## Component Details

### 1. Main Application (main.ts)
- **Purpose**: Bootstrap and configure the NestJS application
- **Responsibilities**:
  - Setup Swagger documentation
  - Configure global pipes and filters
  - Enable CORS
  - Start HTTP server

### 2. OCR Module
Central module for OCR operations.

#### OCR Controller
- **Endpoints**:
  - `POST /ocr/extract` - Single file extraction
  - `POST /ocr/extract/batch` - Multiple file extraction
  - `GET /ocr/health` - Health check
  - `GET /ocr/supported-formats` - List capabilities
- **Features**:
  - File upload handling
  - Request validation
  - Response formatting
  - Error handling

#### OCR Service
- **Responsibilities**:
  - Provider selection (local vs API)
  - PDF conversion coordination
  - Document type detection coordination
  - Schema extraction coordination
  - File cleanup management

#### OCR Providers
**Local OCR Provider**:
- Spawns Python subprocess
- Passes image path and prompt
- Receives OCR results
- Error handling and timeout management

**API OCR Provider**:
- HTTP client for DeepSeek API
- Base64 image encoding
- Authentication headers
- Retry logic

### 3. Document Module

#### PDF Processor Service
- **Function**: Convert PDF to images
- **Tools**: poppler-utils (pdftoppm)
- **Output**: Array of image paths
- **Fallback**: ImageMagick convert

#### Document Detector Service
- **Function**: Identify document type
- **Method**: Pattern matching
- **Patterns**:
  - Invoice: invoice number, bill to, amount due
  - Receipt: receipt, transaction, payment method
  - Form: field labels (name, email, phone)
  - Table: delimiters and consistent columns
- **Output**: Document type + confidence

#### Schema Extractor Service
- **Function**: Extract structured data
- **Methods**:
  - `extractInvoiceSchema()` - Vendor, items, totals
  - `extractReceiptSchema()` - Merchant, items, total
  - `extractFormSchema()` - Key-value pairs
  - `extractTableSchema()` - Headers and rows
- **Output**: Typed JSON schema

### 4. Storage Module

#### Storage Service
- **File Validation**:
  - Check file type (jpg, jpeg, png, pdf)
  - Check file size (max configurable)
- **File Management**:
  - Generate unique filenames (UUID)
  - Save to temp directory
  - Delete after processing
  - Cleanup old files (24h)

### 5. Common Module

#### HTTP Exception Filter
- Global error handling
- Consistent error response format
- Status code mapping
- Error logging

#### Transform Interceptor
- Response transformation
- Consistent response wrapping

## Data Flow

### Single File Extraction Flow

```
1. Client uploads file
   ↓
2. Controller receives request
   ↓
3. Storage Service validates & saves file
   ↓
4. OCR Service checks if PDF
   ↓
5a. If PDF: PDF Processor → Convert to images
5b. If Image: Use directly
   ↓
6. OCR Provider processes image(s)
   ↓
7. Document Detector identifies type
   ↓
8. Schema Extractor creates structured data
   ↓
9. Storage Service cleans up temp files
   ↓
10. Controller returns JSON response
```

### Batch Processing Flow

```
1. Client uploads multiple files
   ↓
2. Controller receives files array
   ↓
3. OCR Service processes in parallel
   ↓
4. Each file goes through single extraction flow
   ↓
5. Results aggregated
   ↓
6. Controller returns batch response
```

## Configuration Flow

```
.env file
   ↓
ConfigModule (Global)
   ↓
ConfigService (Injectable)
   ↓
All Services
```

## Module Dependencies

```
AppModule
├── ConfigModule (Global)
├── OcrModule
│   ├── HttpModule (for API provider)
│   ├── DocumentModule
│   └── StorageModule
├── DocumentModule
│   └── StorageModule
└── StorageModule
```

## Swagger Documentation

```
SwaggerModule.setup()
   ↓
Generates from:
├── Controller decorators (@ApiTags, @ApiOperation)
├── DTO decorators (@ApiProperty, @ApiResponse)
├── Method decorators (@ApiConsumes, @ApiQuery)
└── Schema decorators
   ↓
Serves:
├── /api/docs - Interactive UI
└── /api/docs-json - JSON specification
```

## Error Handling Strategy

```
Error occurs in any layer
   ↓
Caught by Global Exception Filter
   ↓
Formatted as:
{
  statusCode: number,
  error: string,
  message: string,
  timestamp: ISO8601
}
   ↓
Returned to client with appropriate HTTP status
```

## Deployment Modes

### Development
```
npm run start:dev
├── Hot reload enabled
├── Source maps
└── Debug logging
```

### Production
```
npm run build → npm run start:prod
├── Compiled JavaScript
├── Optimized
└── No source maps
```

### Docker
```
docker-compose up
├── Containerized app
├── Environment from .env
└── Health checks enabled
```

## Security Considerations

1. **File Validation**: Type and size checks
2. **Sandboxed Processing**: Temp directory isolation
3. **Automatic Cleanup**: Remove processed files
4. **Error Sanitization**: No sensitive data in errors
5. **API Key Protection**: Environment variables only
6. **CORS Configuration**: Configurable origins

## Performance Optimizations

1. **Async Processing**: All I/O operations are async
2. **Parallel Batch Processing**: Promise.all for multiple files
3. **Streaming**: Large file handling
4. **Cleanup Scheduling**: Background cleanup tasks
5. **Provider Caching**: OCR provider selection cached

## Monitoring and Health

### Health Endpoint
```
GET /ocr/health
Returns:
{
  status: "ok" | "degraded",
  ocrMode: "local" | "api",
  modelAvailable: boolean,
  timestamp: ISO8601
}
```

### Logging
- Request logging
- Error logging
- Processing time tracking
- File operation logging

---

## Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+
- **OCR**: DeepSeek-OCR (Python/PyTorch)
- **PDF Processing**: poppler-utils
- **Documentation**: Swagger/OpenAPI 3.0
- **Containerization**: Docker + Docker Compose

## Design Principles

1. **Modularity**: Clear separation of concerns
2. **Dependency Injection**: NestJS DI container
3. **Type Safety**: Full TypeScript coverage
4. **Documentation First**: Swagger decorators everywhere
5. **Error Resilience**: Comprehensive error handling
6. **Testability**: Injectable services, mockable providers
7. **Configurability**: Environment-based configuration
8. **Scalability**: Stateless design, horizontal scaling ready

