import { Injectable } from '@nestjs/common';
import { DocumentType } from '../../ocr/dto/document-types.enum';
import {
    FormSchema,
    InvoiceSchema,
    ReceiptSchema,
    TableSchema,
} from '../../ocr/dto/extract.dto';
import { ExtractionResult } from '../../ocr/interfaces/ocr-result.interface';

@Injectable()
export class SchemaExtractorService {
    extractSchema(
        text: string,
        documentType: DocumentType,
    ): ExtractionResult {
        let schema: any;
        let confidence = 0.7;

        switch (documentType) {
            case DocumentType.INVOICE:
                schema = this.extractInvoiceSchema(text);
                break;
            case DocumentType.RECEIPT:
                schema = this.extractReceiptSchema(text);
                break;
            case DocumentType.FORM:
                schema = this.extractFormSchema(text);
                break;
            case DocumentType.TABLE:
                schema = this.extractTableSchema(text);
                break;
            default:
                schema = { rawText: text };
                confidence = 0.3;
        }

        return {
            documentType,
            confidence,
            schema,
            rawText: text,
        };
    }

    private extractInvoiceSchema(text: string): InvoiceSchema {
        const invoice: Partial<InvoiceSchema> = {
            items: [],
        };

        // Extract vendor name (usually at the top or after "from")
        const vendorMatch = text.match(/(?:from|vendor|company)[:\s]+([^\n]+)/i);
        invoice.vendor = vendorMatch ? vendorMatch[1].trim() : 'Unknown Vendor';

        // Extract invoice number
        const invoiceNumMatch = text.match(/invoice\s*(?:number|#|no\.?)[:\s]+([A-Z0-9-]+)/i);
        invoice.invoiceNumber = invoiceNumMatch ? invoiceNumMatch[1].trim() : undefined;

        // Extract dates
        const dateMatch = text.match(/(?:invoice\s*)?date[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i);
        invoice.date = dateMatch ? dateMatch[1].trim() : undefined;

        const dueDateMatch = text.match(/due\s*date[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i);
        invoice.dueDate = dueDateMatch ? dueDateMatch[1].trim() : undefined;

        // Extract line items (simplified)
        const lines = text.split('\n');
        for (const line of lines) {
            // Look for lines with amounts (price patterns)
            const amountMatch = line.match(/\$?\s*(\d+[,.]?\d*\.?\d{2})/);
            if (amountMatch && line.length > 10) {
                const description = line.replace(/\$?\s*\d+[,.]?\d*\.?\d{2}/g, '').trim();
                if (description.length > 3) {
                    invoice.items.push({
                        description,
                        total: parseFloat(amountMatch[1].replace(/[,$]/g, '')),
                    });
                }
            }
        }

        // Extract totals
        const subtotalMatch = text.match(/subtotal[:\s]+\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
        invoice.subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/[,$]/g, '')) : undefined;

        const taxMatch = text.match(/tax[:\s]+\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
        invoice.tax = taxMatch ? parseFloat(taxMatch[1].replace(/[,$]/g, '')) : undefined;

        const totalMatch = text.match(/total[:\s]+\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
        invoice.total = totalMatch ? parseFloat(totalMatch[1].replace(/[,$]/g, '')) : 0;

        // Extract currency
        const currencyMatch = text.match(/\b(USD|EUR|GBP|CAD|AUD)\b/i);
        invoice.currency = currencyMatch ? currencyMatch[1].toUpperCase() : 'USD';

        return invoice as InvoiceSchema;
    }

    private extractReceiptSchema(text: string): ReceiptSchema {
        const receipt: Partial<ReceiptSchema> = {
            items: [],
        };

        // Extract merchant name (usually at the top)
        const lines = text.split('\n').filter(l => l.trim());
        receipt.merchant = lines[0]?.trim() || 'Unknown Merchant';

        // Extract date
        const dateMatch = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
        receipt.date = dateMatch ? dateMatch[1].trim() : undefined;

        // Extract items
        for (const line of lines) {
            const itemMatch = line.match(/^(.+?)\s+\$?\s*(\d+[,.]?\d*\.?\d{2})$/);
            if (itemMatch) {
                receipt.items.push({
                    name: itemMatch[1].trim(),
                    price: parseFloat(itemMatch[2].replace(/[,$]/g, '')),
                });
            }
        }

        // Extract total
        const totalMatch = text.match(/total[:\s]+\$?\s*(\d+[,.]?\d*\.?\d{2})/i);
        receipt.total = totalMatch ? parseFloat(totalMatch[1].replace(/[,$]/g, '')) : 0;

        // Extract transaction ID
        const transactionMatch = text.match(/(?:transaction|trans|ref)[:\s#]+([A-Z0-9-]+)/i);
        receipt.transactionId = transactionMatch ? transactionMatch[1].trim() : undefined;

        // Extract payment method
        const paymentMatch = text.match(/(?:payment|card)[:\s]+([^\n]+)/i);
        receipt.paymentMethod = paymentMatch ? paymentMatch[1].trim() : undefined;

        return receipt as ReceiptSchema;
    }

    private extractFormSchema(text: string): FormSchema {
        const fields: Record<string, string> = {};
        const lines = text.split('\n');

        for (const line of lines) {
            // Look for key-value patterns
            const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
            if (colonMatch) {
                const key = colonMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
                const value = colonMatch[2].trim();
                if (key && value) {
                    fields[key] = value;
                }
                continue;
            }

            // Look for labeled fields
            const labelMatch = line.match(/^([A-Za-z\s]+):\s*(.*)$/);
            if (labelMatch) {
                const key = labelMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
                const value = labelMatch[2].trim();
                if (key) {
                    fields[key] = value || '';
                }
            }
        }

        return { fields };
    }

    private extractTableSchema(text: string): TableSchema {
        const lines = text.split('\n').filter(l => l.trim());
        const headers: string[] = [];
        const rows: string[][] = [];

        if (lines.length === 0) {
            return { headers: [], rows: [] };
        }

        // Try to detect delimiter
        let delimiter = '\t';
        const delimiters = ['|', '\t', ',', ';'];

        for (const delim of delimiters) {
            const firstLineCount = (lines[0].match(new RegExp(`\\${delim}`, 'g')) || []).length;
            if (firstLineCount > 0) {
                delimiter = delim;
                break;
            }
        }

        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip separator lines
            if (/^[-─═|+┼┬┴├┤]+$/.test(line.trim())) {
                continue;
            }

            // Split by delimiter
            let cells = line.split(delimiter).map(cell => cell.trim());

            // Remove empty cells at the beginning and end
            while (cells.length > 0 && !cells[0]) cells.shift();
            while (cells.length > 0 && !cells[cells.length - 1]) cells.pop();

            if (cells.length === 0) continue;

            // First non-empty line is headers
            if (headers.length === 0) {
                headers.push(...cells);
            } else {
                rows.push(cells);
            }
        }

        return { headers, rows };
    }
}

