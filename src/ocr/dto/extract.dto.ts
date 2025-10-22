import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from './document-types.enum';

export class ExtractQueryDto {
  @ApiPropertyOptional({
    enum: DocumentType,
    description: 'Optional hint about the document type',
    example: DocumentType.INVOICE,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;
}

export class InvoiceSchema {
  @ApiProperty({ example: 'Acme Corporation' })
  vendor: string;

  @ApiProperty({ example: 'INV-2024-001' })
  invoiceNumber?: string;

  @ApiProperty({ example: '2024-01-15' })
  date?: string;

  @ApiProperty({ example: '2024-02-15' })
  dueDate?: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        quantity: { type: 'number' },
        unitPrice: { type: 'number' },
        total: { type: 'number' },
      },
    },
  })
  items: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;

  @ApiProperty({ example: 1000 })
  subtotal?: number;

  @ApiProperty({ example: 100 })
  tax?: number;

  @ApiProperty({ example: 1100 })
  total: number;

  @ApiProperty({ example: 'USD' })
  currency?: string;
}

export class ReceiptSchema {
  @ApiProperty({ example: 'Corner Store' })
  merchant: string;

  @ApiProperty({ example: '2024-01-15 14:30:00' })
  date?: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        quantity: { type: 'number' },
        price: { type: 'number' },
      },
    },
  })
  items: Array<{
    name: string;
    quantity?: number;
    price?: number;
  }>;

  @ApiProperty({ example: 45.99 })
  total: number;

  @ApiProperty({ example: '1234' })
  transactionId?: string;

  @ApiProperty({ example: 'Credit Card' })
  paymentMethod?: string;
}

export class FormSchema {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  })
  fields: Record<string, string>;
}

export class TableSchema {
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    example: ['Name', 'Age', 'City'],
  })
  headers: string[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'string' },
    },
    example: [
      ['John Doe', '30', 'New York'],
      ['Jane Smith', '25', 'Los Angeles'],
    ],
  })
  rows: string[][];
}

export class ExtractResponseDto {
  @ApiProperty({ example: 'document.pdf' })
  filename: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.INVOICE })
  documentType: DocumentType;

  @ApiProperty({ example: 0.95 })
  confidence: number;

  @ApiProperty({
    description: 'Extracted structured data based on document type',
    oneOf: [
      { $ref: getSchemaPath(InvoiceSchema) },
      { $ref: getSchemaPath(ReceiptSchema) },
      { $ref: getSchemaPath(FormSchema) },
      { $ref: getSchemaPath(TableSchema) },
    ],
  })
  schema: InvoiceSchema | ReceiptSchema | FormSchema | TableSchema | Record<string, unknown>;

  @ApiProperty({ example: 'Extracted raw text from OCR...' })
  rawText?: string;
}

export class BatchExtractResponseDto {
  @ApiProperty({ type: [ExtractResponseDto] })
  results: ExtractResponseDto[];

  @ApiProperty({ example: 5 })
  totalProcessed: number;

  @ApiProperty({ example: 5 })
  successful: number;

  @ApiProperty({ example: 0 })
  failed: number;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Invalid file format' })
  message: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  timestamp: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'local' })
  ocrMode: string;

  @ApiProperty({ example: true })
  modelAvailable: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  timestamp: string;
}

export class SupportedFormatsResponseDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    example: ['jpg', 'jpeg', 'png', 'pdf'],
  })
  supportedFileTypes: string[];

  @ApiProperty({
    type: 'array',
    enum: DocumentType,
    example: [DocumentType.INVOICE, DocumentType.RECEIPT, DocumentType.FORM, DocumentType.TABLE],
  })
  supportedDocumentTypes: DocumentType[];

  @ApiProperty({ example: 10 })
  maxFileSizeMB: number;

  @ApiProperty({
    description: 'Example schemas for each document type',
    type: 'object',
    properties: {
      invoice: { $ref: getSchemaPath(InvoiceSchema) },
      receipt: { $ref: getSchemaPath(ReceiptSchema) },
      form: { $ref: getSchemaPath(FormSchema) },
      table: { $ref: getSchemaPath(TableSchema) },
    },
  })
  exampleSchemas: {
    invoice: Partial<InvoiceSchema>;
    receipt: Partial<ReceiptSchema>;
    form: Partial<FormSchema>;
    table: Partial<TableSchema>;
  };
}
