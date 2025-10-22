import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors();

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Swagger configuration
    const config = new DocumentBuilder()
        .setTitle('DeepSeek-OCR API')
        .setDescription(
            'Extract structured data from documents and images (invoices, receipts, forms, tables) using DeepSeek-OCR',
        )
        .setVersion('1.0')
        .addTag('OCR', 'Optical Character Recognition endpoints')
        .addTag('Health', 'Health check endpoints')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    // Setup Swagger UI at /api/docs and JSON at /api/docs-json
    SwaggerModule.setup('api/docs', app, document, {
        jsonDocumentUrl: 'api/docs-json',
        customSiteTitle: 'DeepSeek-OCR API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger Documentation: http://localhost:${port}/api/docs`);
    console.log(`Swagger JSON: http://localhost:${port}/api/docs-json`);
}

bootstrap();

