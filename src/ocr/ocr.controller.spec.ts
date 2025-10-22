import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from './dto/document-types.enum';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

describe('OcrController', () => {
  let controller: OcrController;
  let service: OcrService;

  const mockOcrService = {
    extractFromFile: jest.fn(),
    extractFromMultipleFiles: jest.fn(),
    checkHealth: jest.fn(),
    getSupportedFormats: jest.fn(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test'),
    stream: null,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [
        {
          provide: OcrService,
          useValue: mockOcrService,
        },
      ],
    }).compile();

    controller = module.get<OcrController>(OcrController);
    service = module.get<OcrService>(OcrService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('extract', () => {
    it('should extract data from a single file', async () => {
      const mockResult = {
        filename: 'test.pdf',
        documentType: DocumentType.INVOICE,
        confidence: 0.95,
        schema: { vendor: 'Test Corp' },
        rawText: 'Test text',
      };

      mockOcrService.extractFromFile.mockResolvedValue(mockResult);

      const result = await controller.extract(mockFile, {});

      expect(result).toEqual(mockResult);
      expect(service.extractFromFile).toHaveBeenCalledWith(mockFile, undefined);
    });

    it('should extract with document type hint', async () => {
      const mockResult = {
        filename: 'test.pdf',
        documentType: DocumentType.INVOICE,
        confidence: 0.95,
        schema: { vendor: 'Test Corp' },
        rawText: 'Test text',
      };

      mockOcrService.extractFromFile.mockResolvedValue(mockResult);

      const result = await controller.extract(mockFile, {
        documentType: DocumentType.INVOICE,
      });

      expect(result).toEqual(mockResult);
      expect(service.extractFromFile).toHaveBeenCalledWith(mockFile, DocumentType.INVOICE);
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(controller.extract(null, {})).rejects.toThrow(BadRequestException);
      await expect(controller.extract(null, {})).rejects.toThrow('No file uploaded');
    });
  });

  describe('extractBatch', () => {
    it('should process multiple files', async () => {
      const mockFiles = [mockFile, mockFile];
      const mockResult = {
        results: [
          {
            filename: 'test1.pdf',
            documentType: DocumentType.INVOICE,
            confidence: 0.95,
            schema: {},
            rawText: '',
          },
          {
            filename: 'test2.pdf',
            documentType: DocumentType.RECEIPT,
            confidence: 0.92,
            schema: {},
            rawText: '',
          },
        ],
        totalProcessed: 2,
        successful: 2,
        failed: 0,
      };

      mockOcrService.extractFromMultipleFiles.mockResolvedValue(mockResult);

      const result = await controller.extractBatch(mockFiles);

      expect(result).toEqual({
        results: mockResult.results,
        totalProcessed: 2,
        successful: 2,
        failed: 0,
      });
      expect(service.extractFromMultipleFiles).toHaveBeenCalledWith(mockFiles);
    });

    it('should throw BadRequestException when no files uploaded', async () => {
      await expect(controller.extractBatch([])).rejects.toThrow(BadRequestException);
      await expect(controller.extractBatch(null)).rejects.toThrow(BadRequestException);
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const mockHealth = {
        status: 'ok',
        ocrMode: 'local',
        modelAvailable: true,
        timestamp: '2024-01-15T10:30:00.000Z',
      };

      mockOcrService.checkHealth.mockResolvedValue(mockHealth);

      const result = await controller.health();

      expect(result).toEqual(mockHealth);
      expect(service.checkHealth).toHaveBeenCalled();
    });
  });

  describe('supportedFormats', () => {
    it('should return supported formats', async () => {
      const mockFormats = {
        supportedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
        supportedDocumentTypes: [
          DocumentType.INVOICE,
          DocumentType.RECEIPT,
          DocumentType.FORM,
          DocumentType.TABLE,
        ],
        maxFileSizeMB: 10,
        exampleSchemas: {},
      };

      mockOcrService.getSupportedFormats.mockReturnValue(mockFormats);

      const result = await controller.supportedFormats();

      expect(result).toEqual(mockFormats);
      expect(service.getSupportedFormats).toHaveBeenCalled();
    });
  });
});
