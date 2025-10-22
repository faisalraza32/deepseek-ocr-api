import { Injectable } from '@nestjs/common';
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
        this.ocrProvider =
            ocrMode === 'api' ? this.apiOcrProvider : this.localOcrProvider;
    }

    async extractFromFile(
        file: Express.Multer.File,
        documentTypeHint?: DocumentType,
    ): Promise<ExtractResponseDto> {
        let filePath: string | null = null;
        let imagePaths: string[] = [];

        try {
            // Save uploaded file
            filePath = await this.storageService.saveFile(file);

            // Check if PDF and convert to images
            const isPdf = await this.pdfProcessorService.isPdf(filePath);
            if (isPdf) {
                imagePaths = await this.pdfProcessorService.convertPdfToImages(filePath);
            } else {
                imagePaths = [filePath];
            }

            // Process each image with OCR
            const ocrResults = await Promise.all(
                imagePaths.map((imagePath) => this.ocrProvider.processImage(imagePath)),
            );

            // Combine text from all pages
            const fullText = ocrResults.map((result) => result.text).join('\n\n');
            const avgConfidence =
                ocrResults.reduce((sum, result) => sum + (result.confidence || 0), 0) /
                ocrResults.length;

            // Detect document type if not provided
            let documentType = documentTypeHint;
            let detectionConfidence = 1;

            if (!documentType || documentType === DocumentType.UNKNOWN) {
                const detection =
                    this.documentDetectorService.detectDocumentType(fullText);
                documentType = detection.documentType;
                detectionConfidence = detection.confidence;
            }

            // Extract structured schema
            const extraction = this.schemaExtractorService.extractSchema(
                fullText,
                documentType,
            );

            return {
                filename: file.originalname,
                documentType: extraction.documentType,
                confidence: Math.min(avgConfidence, detectionConfidence),
                schema: extraction.schema,
                rawText: fullText,
            };
        } finally {
            // Cleanup temporary files
            if (filePath) {
                await this.storageService.deleteFile(filePath);
            }
            if (imagePaths.length > 0) {
                await this.storageService.deleteFiles(imagePaths);
            }
        }
    }

    async extractFromMultipleFiles(
        files: Express.Multer.File[],
    ): Promise<{
        results: ExtractResponseDto[];
        totalProcessed: number;
        successful: number;
        failed: number;
    }> {
        const results: ExtractResponseDto[] = [];
        let successful = 0;
        let failed = 0;

        // Process files in parallel
        const promises = files.map(async (file) => {
            try {
                const result = await this.extractFromFile(file);
                successful++;
                return result;
            } catch (error) {
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
        const ocrMode = this.configService.get<string>('OCR_MODE', 'local');
        const modelAvailable = await this.ocrProvider.isAvailable();

        return {
            status: modelAvailable ? 'ok' : 'degraded',
            ocrMode,
            modelAvailable,
            timestamp: new Date().toISOString(),
        };
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
                    items: [
                        { description: 'Product A', quantity: 2, unitPrice: 50, total: 100 },
                    ],
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

