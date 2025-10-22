import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '../../ocr/dto/document-types.enum';
import { SchemaExtractorService } from './schema-extractor.service';

describe('SchemaExtractorService', () => {
  let service: SchemaExtractorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaExtractorService],
    }).compile();

    service = module.get<SchemaExtractorService>(SchemaExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractSchema', () => {
    it('should extract invoice schema', () => {
      const text = `
        From: Acme Corporation
        Invoice Number: INV-2024-001
        Date: 2024-01-15
        Due Date: 2024-02-15
        Product A $50.00
        Product B $30.00
        Subtotal: $80.00
        Tax: $8.00
        Total: $88.00
        USD
      `;

      const result = service.extractSchema(text, DocumentType.INVOICE);

      expect(result.documentType).toBe(DocumentType.INVOICE);
      expect(result.schema).toHaveProperty('vendor');
      expect(result.schema).toHaveProperty('invoiceNumber');
      expect(result.schema).toHaveProperty('total');
      expect(result.schema.invoiceNumber).toBe('INV-2024-001');
    });

    it('should extract receipt schema', () => {
      const text = `
        Corner Store
        2024-01-15 14:30:00
        Coffee $3.50
        Sandwich $5.99
        Total: $9.49
        Transaction: TX123456
        Payment: Credit Card
      `;

      const result = service.extractSchema(text, DocumentType.RECEIPT);

      expect(result.documentType).toBe(DocumentType.RECEIPT);
      expect(result.schema).toHaveProperty('merchant');
      expect(result.schema).toHaveProperty('total');
      expect(result.schema).toHaveProperty('transactionId');
      expect(result.schema.merchant).toBeDefined();
    });

    it('should extract form schema', () => {
      const text = `
        First Name: John
        Last Name: Doe
        Email: john@example.com
        Phone: 555-1234
        Address: 123 Main St
      `;

      const result = service.extractSchema(text, DocumentType.FORM);

      expect(result.documentType).toBe(DocumentType.FORM);
      expect(result.schema).toHaveProperty('fields');
      expect(result.schema.fields).toHaveProperty('email');
    });

    it('should extract table schema', () => {
      const text = `
        | Name      | Age | City        |
        |-----------|-----|-------------|
        | John Doe  | 30  | New York    |
        | Jane Smith| 25  | Los Angeles |
      `;

      const result = service.extractSchema(text, DocumentType.TABLE);

      expect(result.documentType).toBe(DocumentType.TABLE);
      expect(result.schema).toHaveProperty('headers');
      expect(result.schema).toHaveProperty('rows');
      expect(result.schema.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.schema.rows).toHaveLength(2);
    });

    it('should handle unknown document type', () => {
      const text = 'Random text';

      const result = service.extractSchema(text, DocumentType.UNKNOWN);

      expect(result.documentType).toBe(DocumentType.UNKNOWN);
      expect(result.schema).toEqual({ rawText: text });
      expect(result.confidence).toBe(0.3);
    });

    it('should extract currency from invoice', () => {
      const text = `
        Invoice
        Total: $100.00 EUR
      `;

      const result = service.extractSchema(text, DocumentType.INVOICE);

      expect(result.schema.currency).toBe('EUR');
    });

    it('should default to USD when no currency found', () => {
      const text = `
        Invoice
        Total: $100.00
      `;

      const result = service.extractSchema(text, DocumentType.INVOICE);

      expect(result.schema.currency).toBe('USD');
    });

    it('should extract multiple line items from invoice', () => {
      const text = `
        Item 1 $50.00
        Item 2 $30.00
        Item 3 $20.00
      `;

      const result = service.extractSchema(text, DocumentType.INVOICE);

      expect(result.schema.items.length).toBeGreaterThan(0);
    });

    it('should include raw text in all results', () => {
      const text = 'Test text';

      const result = service.extractSchema(text, DocumentType.INVOICE);

      expect(result.rawText).toBe(text);
    });
  });
});
