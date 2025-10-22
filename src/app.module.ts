import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentModule } from './document/document.module';
import { OcrModule } from './ocr/ocr.module';
import { StorageModule } from './storage/storage.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        OcrModule,
        DocumentModule,
        StorageModule,
    ],
})
export class AppModule {}

