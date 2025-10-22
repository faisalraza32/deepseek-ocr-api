import { DocumentType } from '../dto/document-types.enum';

export interface OcrResult {
    text: string;
    confidence?: number;
    metadata?: Record<string, any>;
}

export interface IOcrProvider {
    processImage(imagePath: string, prompt?: string): Promise<OcrResult>;
    isAvailable(): Promise<boolean>;
}

export interface DetectionResult {
    documentType: DocumentType;
    confidence: number;
    rawText: string;
}

export interface ExtractionResult {
    documentType: DocumentType;
    confidence: number;
    schema: any;
    rawText: string;
}

