import { Injectable, Logger } from '@nestjs/common';
import { DocumentType } from '../../ocr/dto/document-types.enum';
import { DetectionResult } from '../../ocr/interfaces/ocr-result.interface';

@Injectable()
export class DocumentDetectorService {
  private readonly logger = new Logger(DocumentDetectorService.name);

  constructor() {
    this.logger.log('Document Detector Service initialized');
  }

  detectDocumentType(text: string): DetectionResult {
    this.logger.debug(`Detecting document type from text (${text.length} characters)`);
    const startTime = Date.now();
    // Invoice detection patterns
    const invoicePatterns = [
      /invoice\s*(number|#|no\.?)/i,
      /bill\s*to/i,
      /invoice\s*date/i,
      /due\s*date/i,
      /subtotal/i,
      /amount\s*due/i,
    ];

    // Receipt detection patterns
    const receiptPatterns = [
      /receipt/i,
      /thank\s*you/i,
      /transaction/i,
      /payment\s*method/i,
      /card\s*number/i,
      /store/i,
    ];

    // Form detection patterns
    const formPatterns = [
      /first\s*name/i,
      /last\s*name/i,
      /email/i,
      /phone/i,
      /address/i,
      /signature/i,
      /date\s*of\s*birth/i,
    ];

    // Table detection patterns
    const tablePatterns = [
      /\|.*\|/, // Pipes indicating table structure
      /─+/, // Horizontal lines in tables
      /┌|┐|└|┘/, // Box drawing characters
    ];

    // Count matches for each type
    let invoiceScore = 0;
    let receiptScore = 0;
    let formScore = 0;
    let tableScore = 0;

    invoicePatterns.forEach((pattern) => {
      if (pattern.test(text)) invoiceScore++;
    });

    receiptPatterns.forEach((pattern) => {
      if (pattern.test(text)) receiptScore++;
    });

    formPatterns.forEach((pattern) => {
      if (pattern.test(text)) formScore++;
    });

    tablePatterns.forEach((pattern) => {
      if (pattern.test(text)) tableScore++;
    });

    // Check for structured table format (multiple rows with consistent separators)
    const lines = text.split('\n').filter((line) => line.trim());
    const hasConsistentColumns = this.detectTableStructure(lines);
    if (hasConsistentColumns) {
      tableScore += 3;
    }

    // Determine the document type based on scores
    const maxScore = Math.max(invoiceScore, receiptScore, formScore, tableScore);

    if (maxScore === 0) {
      const duration = Date.now() - startTime;
      this.logger.warn(
        `Document type detection completed in ${duration}ms: UNKNOWN (no patterns matched)`,
      );
      return {
        documentType: DocumentType.UNKNOWN,
        confidence: 0.3,
        rawText: text,
      };
    }

    let documentType: DocumentType;
    let confidence: number;

    if (invoiceScore === maxScore) {
      documentType = DocumentType.INVOICE;
      confidence = Math.min(0.5 + invoiceScore * 0.1, 0.95);
    } else if (receiptScore === maxScore) {
      documentType = DocumentType.RECEIPT;
      confidence = Math.min(0.5 + receiptScore * 0.1, 0.95);
    } else if (tableScore === maxScore) {
      documentType = DocumentType.TABLE;
      confidence = Math.min(0.5 + tableScore * 0.1, 0.95);
    } else {
      documentType = DocumentType.FORM;
      confidence = Math.min(0.5 + formScore * 0.1, 0.95);
    }

    const duration = Date.now() - startTime;
    this.logger.debug(
      `Document type detected in ${duration}ms: ${documentType} (confidence: ${(confidence * 100).toFixed(1)}%, scores: invoice=${invoiceScore}, receipt=${receiptScore}, form=${formScore}, table=${tableScore})`,
    );

    return {
      documentType,
      confidence,
      rawText: text,
    };
  }

  private detectTableStructure(lines: string[]): boolean {
    if (lines.length < 3) return false;

    // Count lines with consistent delimiters
    let delimiterCount = 0;
    const delimiters = ['|', '\t', ',', ';'];

    for (const delimiter of delimiters) {
      const counts = lines.map(
        (line) => (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length,
      );

      // Check if most lines have the same number of delimiters (consistent columns)
      const mostCommonCount = this.getMostCommonValue(counts);
      const consistentLines = counts.filter((c) => c === mostCommonCount && c > 1).length;

      if (consistentLines >= Math.min(3, lines.length * 0.6)) {
        delimiterCount++;
      }
    }

    return delimiterCount > 0;
  }

  private getMostCommonValue(arr: number[]): number {
    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    let mostCommon = 0;

    arr.forEach((val) => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
        mostCommon = val;
      }
    });

    return mostCommon;
  }
}
