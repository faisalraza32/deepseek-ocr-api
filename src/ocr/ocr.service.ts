import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentDetectorService } from '../document/services/document-detector.service';
import { PdfProcessorService } from '../document/services/pdf-processor.service';
import { SchemaExtractorService } from '../document/services/schema-extractor.service';
import { StorageService } from '../storage/storage.service';
import { DocumentType } from './dto/document-types.enum';
import { ExtractResponseDto } from './dto/extract.dto';
import { IOcrProvider } from './interfaces/ocr-result.interface';
import { ApiOcrProvider } from './providers/api-ocr.provider';
import { LocalOcrProvider } from './providers/local-ocr.provider';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ocrProvider: IOcrProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localOcrProvider: LocalOcrProvider,
    private readonly apiOcrProvider: ApiOcrProvider,
    private readonly pdfProcessorService: PdfProcessorService,
    private readonly documentDetectorService: DocumentDetectorService,
    private readonly schemaExtractorService: SchemaExtractorService,
    private readonly storageService: StorageService,
  ) {
    const ocrMode = this.configService.get<string>('OCR_MODE', 'local');
    this.ocrProvider = ocrMode === 'api' ? this.apiOcrProvider : this.localOcrProvider;
    this.logger.log(`OCR Service initialized with mode: ${ocrMode}`);
  }

  async extractFromFile(
    file: Express.Multer.File,
    documentTypeHint?: DocumentType,
  ): Promise<ExtractResponseDto> {
    const startTime = Date.now();
    let filePath: string | null = null;
    let imagePaths: string[] = [];

    try {
      this.logger.debug(`Starting extraction for file: ${file.originalname}`);

      // Save uploaded file
      filePath = await this.storageService.saveFile(file);
      this.logger.debug(`File saved to: ${filePath}`);

      // Check if PDF and convert to images
      const isPdf = await this.pdfProcessorService.isPdf(filePath);
      if (isPdf) {
        this.logger.debug('Detected PDF file, converting to images...');
        imagePaths = await this.pdfProcessorService.convertPdfToImages(filePath);
        this.logger.debug(`PDF converted to ${imagePaths.length} images`);
      } else {
        imagePaths = [filePath];
        this.logger.debug('Processing as image file');
      }

      // Process each image with OCR
      this.logger.debug(`Processing ${imagePaths.length} image(s) with OCR...`);
      const ocrResults = await Promise.all(
        imagePaths.map((imagePath) => this.ocrProvider.processImage(imagePath)),
      );

      // Combine text from all pages
      const fullText = ocrResults.map((result) => result.text).join('\n\n');
      const avgConfidence =
        ocrResults.reduce((sum, result) => sum + (result.confidence || 0), 0) / ocrResults.length;

      this.logger.debug(`OCR completed - Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);

      // Detect document type if not provided
      let documentType = documentTypeHint;
      let detectionConfidence = 1;

      if (!documentType || documentType === DocumentType.UNKNOWN) {
        this.logger.debug('Detecting document type...');
        const detection = this.documentDetectorService.detectDocumentType(fullText);
        documentType = detection.documentType;
        detectionConfidence = detection.confidence;
        this.logger.debug(
          `Detected document type: ${documentType} (confidence: ${(detectionConfidence * 100).toFixed(1)}%)`,
        );
      } else {
        this.logger.debug(`Using provided document type hint: ${documentType}`);
      }

      // Extract structured schema
      this.logger.debug('Extracting structured schema...');
      const extraction = this.schemaExtractorService.extractSchema(fullText, documentType);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Extraction completed for ${file.originalname} in ${duration}ms - Type: ${extraction.documentType}, Confidence: ${(Math.min(avgConfidence, detectionConfidence) * 100).toFixed(1)}%`,
      );

      return {
        filename: file.originalname,
        documentType: extraction.documentType,
        confidence: Math.min(avgConfidence, detectionConfidence),
        schema: extraction.schema,
        rawText: fullText,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to extract from ${file.originalname} after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      // Cleanup temporary files
      if (filePath) {
        await this.storageService.deleteFile(filePath);
      }
      if (imagePaths.length > 0) {
        await this.storageService.deleteFiles(imagePaths);
      }
      this.logger.debug('Temporary files cleaned up');
    }
  }

  async extractFromMultipleFiles(files: Express.Multer.File[]): Promise<{
    results: ExtractResponseDto[];
    totalProcessed: number;
    successful: number;
    failed: number;
  }> {
    const startTime = Date.now();
    this.logger.log(`Starting batch processing of ${files.length} files`);

    const results: ExtractResponseDto[] = [];
    let successful = 0;
    let failed = 0;

    // Process files in parallel
    const promises = files.map(async (file, index) => {
      try {
        this.logger.debug(`[${index + 1}/${files.length}] Processing ${file.originalname}`);
        const result = await this.extractFromFile(file);
        successful++;
        return result;
      } catch (error) {
        this.logger.error(
          `[${index + 1}/${files.length}] Failed to process ${file.originalname}: ${error.message}`,
        );
        failed++;
        return {
          filename: file.originalname,
          documentType: DocumentType.UNKNOWN,
          confidence: 0,
          schema: {},
          rawText: '',
          error: error.message,
        } as any;
      }
    });

    const allResults = await Promise.all(promises);
    results.push(...allResults);

    const duration = Date.now() - startTime;
    this.logger.log(
      `Batch processing completed in ${duration}ms - ${successful} successful, ${failed} failed`,
    );

    return {
      results,
      totalProcessed: files.length,
      successful,
      failed,
    };
  }

  async checkHealth(): Promise<{
    status: string;
    ocrMode: string;
    modelAvailable: boolean;
    timestamp: string;
  }> {
    try {
      const ocrMode = this.configService.get<string>('OCR_MODE', 'local');
      const modelAvailable = await this.ocrProvider.isAvailable();

      const status = modelAvailable ? 'ok' : 'degraded';

      if (status === 'degraded') {
        this.logger.warn(
          `Health check: Service is degraded - Model not available (mode: ${ocrMode})`,
        );
      } else {
        this.logger.debug(`Health check: Service is healthy (mode: ${ocrMode})`);
      }

      return {
        status,
        ocrMode,
        modelAvailable,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return {
        status: 'error',
        ocrMode: 'unknown',
        modelAvailable: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getSupportedFormats(): {
    supportedFileTypes: string[];
    supportedDocumentTypes: DocumentType[];
    maxFileSizeMB: number;
    exampleSchemas: any;
  } {
    return {
      supportedFileTypes: this.storageService.getAllowedFileTypes(),
      supportedDocumentTypes: [
        DocumentType.INVOICE,
        DocumentType.RECEIPT,
        DocumentType.FORM,
        DocumentType.TABLE,
      ],
      maxFileSizeMB: this.storageService.getMaxFileSizeMB(),
      exampleSchemas: {
        invoice: {
          vendor: 'Acme Corporation',
          invoiceNumber: 'INV-2024-001',
          date: '2024-01-15',
          items: [{ description: 'Product A', quantity: 2, unitPrice: 50, total: 100 }],
          total: 100,
        },
        receipt: {
          merchant: 'Corner Store',
          date: '2024-01-15',
          items: [{ name: 'Coffee', price: 3.5 }],
          total: 3.5,
        },
        form: {
          fields: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        },
        table: {
          headers: ['Name', 'Age', 'City'],
          rows: [
            ['John Doe', '30', 'New York'],
            ['Jane Smith', '25', 'Los Angeles'],
          ],
        },
      },
    };
  }
}
