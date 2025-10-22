# Quick Start Guide

Get the DeepSeek-OCR API up and running in minutes!

## Option 1: Quick Start with API Mode (Easiest)

This is the fastest way to get started if you have a DeepSeek API key.

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
OCR_MODE=api
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/ocr
```

3. **Install system dependencies**
```bash
# macOS
brew install poppler

# Ubuntu/Debian
sudo apt-get install poppler-utils

# Windows
# Download from: https://github.com/oschwaldp/poppler-windows/releases
```

4. **Start the server**
```bash
npm run start:dev
```

5. **Test it!**
```bash
curl http://localhost:3000/ocr/health
```

Visit: http://localhost:3000/api/docs

## Option 2: Local Mode (More Control)

Use the local DeepSeek-OCR model for unlimited usage.

1. **Install Node.js dependencies**
```bash
npm install
```

2. **Setup Python environment**
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install PyTorch (choose based on your system)
# For CUDA 11.8:
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu118

# For CPU only:
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu

# Install other dependencies
pip install -r requirements.txt
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
OCR_MODE=local
PYTHON_PATH=python3  # or path to your venv python
DEEPSEEK_MODEL_PATH=deepseek-ai/DeepSeek-OCR
```

4. **Install system dependencies**
```bash
# macOS
brew install poppler

# Ubuntu/Debian
sudo apt-get install poppler-utils
```

5. **Start the server**
```bash
npm run start:dev
```

## Option 3: Docker (Simplest Deployment)

Perfect for production or if you want everything containerized.

1. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

2. **Build and run**
```bash
docker-compose up -d
```

3. **Check logs**
```bash
docker-compose logs -f
```

## Testing the API

### 1. Check Health
```bash
curl http://localhost:3000/ocr/health
```

### 2. Upload a Test Image
```bash
# Create a test receipt
echo "Corner Store
123 Main St
Date: 01/15/2024

Coffee        $3.50
Sandwich      $8.99
Water         $1.50

Total:       $13.99

Thank you!" > test_receipt.txt

# Convert to image (or use any existing image/PDF)
curl -X POST http://localhost:3000/ocr/extract \
  -F "file=@test_receipt.txt"
```

### 3. View API Documentation
Open in browser: http://localhost:3000/api/docs

### 4. Get Swagger JSON
```bash
curl http://localhost:3000/api/docs-json > swagger.json
```

## Common Test Cases

### Invoice Extraction
```bash
curl -X POST "http://localhost:3000/ocr/extract?documentType=invoice" \
  -F "file=@invoice.pdf" \
  -o result.json
```

### Batch Processing
```bash
curl -X POST http://localhost:3000/ocr/extract/batch \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.jpg" \
  -F "files=@doc3.png"
```

### Get Supported Formats
```bash
curl http://localhost:3000/ocr/supported-formats | jq
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API at http://localhost:3000/api/docs
- Check out the example schemas in the Swagger UI
- Integrate with your application using the client examples

## Troubleshooting

### "Python not found"
Make sure Python 3.12+ is installed and the `PYTHON_PATH` in `.env` is correct.

### "pdftoppm: command not found"
Install poppler-utils (see system dependencies section above).

### "CUDA out of memory"
Reduce batch size or switch to CPU mode by not having CUDA installed.

### "Port 3000 already in use"
Change the `PORT` in `.env` to a different port.

### API returns errors
Check the logs: `docker-compose logs -f` or console output in dev mode.

## Support

- GitHub Issues: [Report a bug or request a feature]
- Documentation: [README.md](README.md)
- API Docs: http://localhost:3000/api/docs

