import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentType } from './dto/document-types.enum';
import {
  BatchExtractResponseDto,
  ErrorResponseDto,
  ExtractQueryDto,
  ExtractResponseDto,
  FormSchema,
  HealthResponseDto,
  InvoiceSchema,
  ReceiptSchema,
  SupportedFormatsResponseDto,
  TableSchema,
} from './dto/extract.dto';
import { OcrService } from './ocr.service';

@ApiTags('OCR')
@ApiExtraModels(InvoiceSchema, ReceiptSchema, FormSchema, TableSchema)
@Controller('ocr')
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(private readonly ocrService: OcrService) {}

  @Post('extract')
  @ApiOperation({
    summary: 'Extract structured data from a single document',
    description:
      'Upload an image or PDF file to extract structured data. The API will automatically detect the document type and return the appropriate schema.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image or PDF file to process',
        },
      },
    },
  })
  @ApiQuery({
    name: 'documentType',
    required: false,
    enum: DocumentType,
    description: 'Optional hint about the document type',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully extracted data from document',
    type: ExtractResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async extract(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ExtractQueryDto,
  ): Promise<ExtractResponseDto> {
    if (!file) {
      this.logger.warn('Extract request received without file');
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(
      `Processing file: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)${query.documentType ? ` - Type hint: ${query.documentType}` : ''}`,
    );

    const result = await this.ocrService.extractFromFile(file, query.documentType);

    this.logger.log(
      `Successfully extracted ${result.documentType} from ${file.originalname} - Confidence: ${(result.confidence * 100).toFixed(1)}%`,
    );

    return result;
  }

  @Post('extract/batch')
  @ApiOperation({
    summary: 'Extract structured data from multiple documents',
    description:
      'Upload multiple image or PDF files to extract structured data in batch. Each file will be processed independently.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple image or PDF files to process',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully processed batch of documents',
    type: BatchExtractResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - no files uploaded',
    type: ErrorResponseDto,
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async extractBatch(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<BatchExtractResponseDto> {
    if (!files || files.length === 0) {
      this.logger.warn('Batch extract request received without files');
      throw new BadRequestException('No files uploaded');
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    this.logger.log(
      `Processing batch of ${files.length} files - Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
    );

    const result = await this.ocrService.extractFromMultipleFiles(files);

    this.logger.log(
      `Batch processing completed: ${result.successful} successful, ${result.failed} failed out of ${result.totalProcessed} files`,
    );

    return {
      results: result.results,
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
    };
  }

  @Get('health')
  @ApiTags('Health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Check the health status of the OCR service and model availability',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    type: HealthResponseDto,
  })
  async health(): Promise<HealthResponseDto> {
    this.logger.debug('Health check requested');
    const health = await this.ocrService.checkHealth();
    this.logger.debug(
      `Health status: ${health.status} - Model available: ${health.modelAvailable}`,
    );
    return health;
  }

  @Get('supported-formats')
  @ApiOperation({
    summary: 'Get supported formats and document types',
    description:
      'Returns information about supported file types, document types, and example schemas',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported formats and capabilities',
    type: SupportedFormatsResponseDto,
  })
  async supportedFormats(): Promise<SupportedFormatsResponseDto> {
    this.logger.debug('Supported formats requested');
    return this.ocrService.getSupportedFormats();
  }
}
