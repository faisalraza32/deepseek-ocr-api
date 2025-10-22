#!/usr/bin/env python3
"""
DeepSeek-OCR Runner Script
This script is used by the NestJS application to run DeepSeek-OCR inference locally.
"""

import sys
import json
import argparse
import torch
from transformers import AutoModel, AutoTokenizer


def run_ocr(image_path: str, prompt: str, model_path: str = "deepseek-ai/DeepSeek-OCR"):
    """
    Run OCR on an image using DeepSeek-OCR model.
    
    Args:
        image_path: Path to the image file
        prompt: Prompt for the model
        model_path: HuggingFace model path
    
    Returns:
        dict: Result containing text and metadata
    """
    try:
        # Load model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        model = AutoModel.from_pretrained(
            model_path,
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,
        )
        
        # Move to GPU if available
        if torch.cuda.is_available():
            model = model.cuda()
        
        model = model.eval()
        
        # Run inference
        with torch.no_grad():
            result = model.infer(
                tokenizer,
                prompt=prompt,
                image_file=image_path,
                base_size=1024,
                image_size=640,
            )
        
        # Return result as JSON
        output = {
            "text": result if isinstance(result, str) else str(result),
            "confidence": 0.85,
            "metadata": {
                "model": model_path,
                "device": "cuda" if torch.cuda.is_available() else "cpu"
            }
        }
        
        print(json.dumps(output))
        return 0
        
    except Exception as e:
        error_output = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_output), file=sys.stderr)
        return 1


def main():
    parser = argparse.ArgumentParser(description="Run DeepSeek-OCR on an image")
    parser.add_argument("image_path", help="Path to the image file")
    parser.add_argument("--prompt", default="<image>\n<|grounding|>Extract all text from this document.",
                       help="Prompt for the model")
    parser.add_argument("--model", default="deepseek-ai/DeepSeek-OCR",
                       help="Model path from HuggingFace")
    
    args = parser.parse_args()
    
    exit_code = run_ocr(args.image_path, args.prompt, args.model)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

