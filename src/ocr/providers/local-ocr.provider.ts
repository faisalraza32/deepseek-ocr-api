import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'node:child_process';
import { IOcrProvider, OcrResult } from '../interfaces/ocr-result.interface';

@Injectable()
export class LocalOcrProvider implements IOcrProvider {
    private readonly pythonPath: string;
    private readonly modelPath: string;

    constructor(private readonly configService: ConfigService) {
        this.pythonPath = this.configService.get<string>('PYTHON_PATH', 'python3');
        this.modelPath = this.configService.get<string>(
            'DEEPSEEK_MODEL_PATH',
            'deepseek-ai/DeepSeek-OCR',
        );
    }

    async processImage(imagePath: string, prompt?: string): Promise<OcrResult> {
        return new Promise((resolve, reject) => {
            const defaultPrompt = prompt || '<image>\n<|grounding|>Extract all text from this document and convert it to markdown format.';

            // Create a Python script inline to run DeepSeek-OCR
            const pythonScript = `
import sys
import torch
from transformers import AutoModel, AutoTokenizer
import json

try:
    model_name = '${this.modelPath}'
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModel.from_pretrained(
        model_name,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
    )
    
    if torch.cuda.is_available():
        model = model.cuda()
    
    model = model.eval()
    
    result = model.infer(
        tokenizer,
        prompt='${defaultPrompt}',
        image_file='${imagePath}',
        base_size=1024,
        image_size=640,
    )
    
    output = {
        'text': result,
        'confidence': 0.85
    }
    print(json.dumps(output))
    
except Exception as e:
    error = {'error': str(e)}
    print(json.dumps(error), file=sys.stderr)
    sys.exit(1)
`;

            const pythonProcess = spawn(this.pythonPath, ['-c', pythonScript]);

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(
                        new InternalServerErrorException(
                            `DeepSeek-OCR processing failed: ${stderr}`,
                        ),
                    );
                    return;
                }

                try {
                    // Find the JSON output in stdout
                    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                        reject(
                            new InternalServerErrorException(
                                'No valid JSON output from DeepSeek-OCR',
                            ),
                        );
                        return;
                    }

                    const result = JSON.parse(jsonMatch[0]);

                    if (result.error) {
                        reject(
                            new InternalServerErrorException(
                                `DeepSeek-OCR error: ${result.error}`,
                            ),
                        );
                        return;
                    }

                    resolve({
                        text: result.text || '',
                        confidence: result.confidence || 0.8,
                        metadata: result.metadata || {},
                    });
                } catch (error) {
                    reject(
                        new InternalServerErrorException(
                            `Failed to parse DeepSeek-OCR output: ${error.message}`,
                        ),
                    );
                }
            });

            pythonProcess.on('error', (error) => {
                reject(
                    new InternalServerErrorException(
                        `Failed to spawn Python process: ${error.message}`,
                    ),
                );
            });
        });
    }

    async isAvailable(): Promise<boolean> {
        return new Promise((resolve) => {
            const pythonProcess = spawn(this.pythonPath, ['--version']);

            pythonProcess.on('close', (code) => {
                resolve(code === 0);
            });

            pythonProcess.on('error', () => {
                resolve(false);
            });
        });
    }
}

