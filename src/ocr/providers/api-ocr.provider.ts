import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import { firstValueFrom } from 'rxjs';
import { IOcrProvider, OcrResult } from '../interfaces/ocr-result.interface';

@Injectable()
export class ApiOcrProvider implements IOcrProvider {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>(
      'DEEPSEEK_API_URL',
      'https://api.deepseek.com/ocr',
    );
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY', '');
  }

  async processImage(imagePath: string, prompt?: string): Promise<OcrResult> {
    try {
      // Read image file as base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const defaultPrompt =
        prompt || 'Extract all text from this document and convert it to structured format.';

      // Make API request to DeepSeek
      const response = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          {
            image: base64Image,
            prompt: defaultPrompt,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds timeout
          },
        ),
      );

      if (!response.data?.text) {
        throw new Error('Invalid response from DeepSeek API');
      }

      return {
        text: response.data.text || '',
        confidence: response.data.confidence || 0.8,
        metadata: response.data.metadata || {},
      };
    } catch (error) {
      if (error.response) {
        throw new InternalServerErrorException(
          `DeepSeek API error: ${error.response.status} - ${error.response.data?.message || error.message}`,
        );
      } else if (error.request) {
        throw new InternalServerErrorException(
          'No response from DeepSeek API. Please check your network connection.',
        );
      } else {
        throw new InternalServerErrorException(
          `Failed to process image with DeepSeek API: ${error.message}`,
        );
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check - try to reach the API
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/health`, {
          timeout: 5000,
          validateStatus: () => true, // Accept any status
        }),
      );
      return response.status < 500;
    } catch {
      return false;
    }
  }
}
