import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DocumentModule } from '../document/document.module';
import { StorageModule } from '../storage/storage.module';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { ApiOcrProvider } from './providers/api-ocr.provider';
import { LocalOcrProvider } from './providers/local-ocr.provider';

@Module({
    imports: [HttpModule, DocumentModule, StorageModule],
    controllers: [OcrController],
    providers: [OcrService, LocalOcrProvider, ApiOcrProvider],
    exports: [OcrService],
})
export class OcrModule {}

