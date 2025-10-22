import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { DocumentDetectorService } from './services/document-detector.service';
import { PdfProcessorService } from './services/pdf-processor.service';
import { SchemaExtractorService } from './services/schema-extractor.service';

@Module({
  imports: [StorageModule],
  providers: [PdfProcessorService, DocumentDetectorService, SchemaExtractorService],
  exports: [PdfProcessorService, DocumentDetectorService, SchemaExtractorService],
})
export class DocumentModule {}
