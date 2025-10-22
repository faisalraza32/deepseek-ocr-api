import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '../../ocr/dto/document-types.enum';
import { DocumentDetectorService } from './document-detector.service';

describe('DocumentDetectorService', () => {
  let service: DocumentDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentDetectorService],
    }).compile();

    service = module.get<DocumentDetectorService>(DocumentDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectDocumentType', () => {
    it('should detect invoice type', () => {
      const text = `
        INVOICE #INV-2024-001
        Bill To: John Doe
        Invoice Date: 2024-01-15
        Due Date: 2024-02-15
        Subtotal: $100.00
        Amount Due: $110.00
      `;

      const result = service.detectDocumentType(text);

      expect(result.documentType).toBe(DocumentType.INVOICE);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect receipt type', () => {
      const text = `
        RECEIPT
        Store Name: Corner Store
        Transaction ID: 123456
        Thank you for your purchase
        Payment Method: Credit Card
        Card Number: **** 1234
      `;

      const result = service.detectDocumentType(text);

      expect(result.documentType).toBe(DocumentType.RECEIPT);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect form type', () => {
      const text = `
        First Name: John
        Last Name: Doe
        Email: john@example.com
        Phone: 555-1234
        Address: 123 Main St
        Date of Birth: 01/01/1990
        Signature: ___________
      `;

      const result = service.detectDocumentType(text);

      expect(result.documentType).toBe(DocumentType.FORM);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect table type', () => {
      const text = `
        | Name      | Age | City        |
        |-----------|-----|-------------|
        | John Doe  | 30  | New York    |
        | Jane Smith| 25  | Los Angeles |
      `;

      const result = service.detectDocumentType(text);

      expect(result.documentType).toBe(DocumentType.TABLE);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should return unknown for text without clear patterns', () => {
      const text = 'This is just some random text without any structure.';

      const result = service.detectDocumentType(text);

      expect(result.documentType).toBe(DocumentType.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should choose highest scoring type when multiple patterns match', () => {
      const text = `
        INVOICE #INV-2024-001
        Bill To: John Doe
        Invoice Date: 2024-01-15
        Receipt Number: 12345
        Thank you
      `;

      const result = service.detectDocumentType(text);

      // Should detect as invoice since it has more invoice patterns
      expect(result.documentType).toBe(DocumentType.INVOICE);
    });

    it('should include raw text in result', () => {
      const text = 'Sample text';

      const result = service.detectDocumentType(text);

      expect(result.rawText).toBe(text);
    });
  });
});
