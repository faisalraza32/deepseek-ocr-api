import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting DeepSeek-OCR API...');

    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Enable CORS
    app.enableCors();
    logger.log('CORS enabled');

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());
    logger.log('Global logging interceptor enabled');

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    logger.log('Global validation pipe configured');

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());
    logger.log('Global exception filter configured');

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
    logger.log('Swagger documentation configured');

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`✓ Application is running on: http://localhost:${port}`);
    logger.log(`✓ Swagger Documentation: http://localhost:${port}/api/docs`);
    logger.log(`✓ Swagger JSON: http://localhost:${port}/api/docs-json`);
    logger.log('🚀 DeepSeek-OCR API started successfully');
  } catch (error) {
    logger.error('Failed to start application', error.stack);
    process.exit(1);
  }
}

bootstrap();
