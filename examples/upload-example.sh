#!/bin/bash

# Example script to test the DeepSeek-OCR API with file uploads

API_URL="${API_URL:-http://localhost:3000}"

echo "🧪 Testing DeepSeek-OCR API File Upload"
echo "========================================"
echo ""

# Check if a file was provided
if [ $# -eq 0 ]; then
    echo "Usage: ./upload-example.sh <file_path> [document_type]"
    echo ""
    echo "Examples:"
    echo "  ./upload-example.sh invoice.pdf"
    echo "  ./upload-example.sh receipt.jpg receipt"
    echo ""
    echo "Document types: invoice, receipt, form, table"
    exit 1
fi

FILE_PATH="$1"
DOCUMENT_TYPE="${2:-}"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "❌ Error: File not found: $FILE_PATH"
    exit 1
fi

echo "📄 File: $FILE_PATH"
echo "🌐 API URL: $API_URL"

# Build the URL
EXTRACT_URL="$API_URL/ocr/extract"
if [ -n "$DOCUMENT_TYPE" ]; then
    EXTRACT_URL="$EXTRACT_URL?documentType=$DOCUMENT_TYPE"
    echo "📋 Document Type Hint: $DOCUMENT_TYPE"
fi

echo ""
echo "⏳ Uploading and processing..."
echo ""

# Upload the file
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$EXTRACT_URL" \
    -F "file=@$FILE_PATH" \
    -H "Accept: application/json")

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    echo "✅ Success! (HTTP $HTTP_STATUS)"
    echo ""
    echo "Response:"
    echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo "❌ Error! (HTTP $HTTP_STATUS)"
    echo ""
    echo "Response:"
    echo "$RESPONSE_BODY"
    exit 1
fi

echo ""
echo "✨ Done!"

