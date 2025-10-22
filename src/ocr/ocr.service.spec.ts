import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentDetectorService } from '../document/services/document-detector.service';
import { PdfProcessorService } from '../document/services/pdf-processor.service';
import { SchemaExtractorService } from '../document/services/schema-extractor.service';
import { StorageService } from '../storage/storage.service';
import { DocumentType } from './dto/document-types.enum';
import { OcrService } from './ocr.service';
import { ApiOcrProvider } from './providers/api-ocr.provider';
import { LocalOcrProvider } from './providers/local-ocr.provider';

describe('OcrService', () => {
  let service: OcrService;
  let storageService: StorageService;
  let pdfProcessor: PdfProcessorService;
  let documentDetector: DocumentDetectorService;
  let schemaExtractor: SchemaExtractorService;
  let localOcrProvider: LocalOcrProvider;

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

  const mockStorageService = {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
    deleteFiles: jest.fn(),
    getAllowedFileTypes: jest.fn(),
    getMaxFileSizeMB: jest.fn(),
  };

  const mockPdfProcessor = {
    isPdf: jest.fn(),
    convertPdfToImages: jest.fn(),
  };

  const mockDocumentDetector = {
    detectDocumentType: jest.fn(),
  };

  const mockSchemaExtractor = {
    extractSchema: jest.fn(),
  };

  const mockLocalOcrProvider = {
    processImage: jest.fn(),
    isAvailable: jest.fn(),
  };

  const mockApiOcrProvider = {
    processImage: jest.fn(),
    isAvailable: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'OCR_MODE') return 'local';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LocalOcrProvider, useValue: mockLocalOcrProvider },
        { provide: ApiOcrProvider, useValue: mockApiOcrProvider },
        { provide: PdfProcessorService, useValue: mockPdfProcessor },
        { provide: DocumentDetectorService, useValue: mockDocumentDetector },
        { provide: SchemaExtractorService, useValue: mockSchemaExtractor },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    storageService = module.get<StorageService>(StorageService);
    pdfProcessor = module.get<PdfProcessorService>(PdfProcessorService);
    documentDetector = module.get<DocumentDetectorService>(DocumentDetectorService);
    schemaExtractor = module.get<SchemaExtractorService>(SchemaExtractorService);
    localOcrProvider = module.get<LocalOcrProvider>(LocalOcrProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractFromFile', () => {
    it('should extract data from an image file', async () => {
      const filePath = '/temp/test.jpg';
      mockStorageService.saveFile.mockResolvedValue(filePath);
      mockPdfProcessor.isPdf.mockResolvedValue(false);
      mockLocalOcrProvider.processImage.mockResolvedValue({
        text: 'Sample invoice text',
        confidence: 0.95,
      });
      mockDocumentDetector.detectDocumentType.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        rawText: 'Sample invoice text',
      });
      mockSchemaExtractor.extractSchema.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        schema: { vendor: 'Test Corp', total: 100 },
        rawText: 'Sample invoice text',
      });

      const result = await service.extractFromFile(mockFile);

      expect(result).toEqual({
        filename: 'test.pdf',
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        schema: { vendor: 'Test Corp', total: 100 },
        rawText: 'Sample invoice text',
      });

      expect(storageService.saveFile).toHaveBeenCalledWith(mockFile);
      expect(pdfProcessor.isPdf).toHaveBeenCalledWith(filePath);
      expect(localOcrProvider.processImage).toHaveBeenCalledWith(filePath);
      expect(storageService.deleteFile).toHaveBeenCalledWith(filePath);
    });

    it('should extract data from a PDF file', async () => {
      const filePath = '/temp/test.pdf';
      const imagePaths = ['/temp/page-1.png', '/temp/page-2.png'];

      mockStorageService.saveFile.mockResolvedValue(filePath);
      mockPdfProcessor.isPdf.mockResolvedValue(true);
      mockPdfProcessor.convertPdfToImages.mockResolvedValue(imagePaths);
      mockLocalOcrProvider.processImage
        .mockResolvedValueOnce({ text: 'Page 1 text', confidence: 0.95 })
        .mockResolvedValueOnce({ text: 'Page 2 text', confidence: 0.93 });
      mockDocumentDetector.detectDocumentType.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        rawText: 'Page 1 text\n\nPage 2 text',
      });
      mockSchemaExtractor.extractSchema.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        schema: { vendor: 'Test Corp', total: 100 },
        rawText: 'Page 1 text\n\nPage 2 text',
      });

      const result = await service.extractFromFile(mockFile);

      expect(result.rawText).toBe('Page 1 text\n\nPage 2 text');
      expect(pdfProcessor.convertPdfToImages).toHaveBeenCalledWith(filePath);
      expect(localOcrProvider.processImage).toHaveBeenCalledTimes(2);
      expect(storageService.deleteFiles).toHaveBeenCalledWith(imagePaths);
    });

    it('should use document type hint when provided', async () => {
      const filePath = '/temp/test.jpg';
      mockStorageService.saveFile.mockResolvedValue(filePath);
      mockPdfProcessor.isPdf.mockResolvedValue(false);
      mockLocalOcrProvider.processImage.mockResolvedValue({
        text: 'Sample receipt text',
        confidence: 0.95,
      });
      mockSchemaExtractor.extractSchema.mockReturnValue({
        documentType: DocumentType.RECEIPT,
        confidence: 0.95,
        schema: { merchant: 'Store', total: 50 },
        rawText: 'Sample receipt text',
      });

      await service.extractFromFile(mockFile, DocumentType.RECEIPT);

      expect(documentDetector.detectDocumentType).not.toHaveBeenCalled();
      expect(schemaExtractor.extractSchema).toHaveBeenCalledWith(
        'Sample receipt text',
        DocumentType.RECEIPT,
      );
    });

    it('should cleanup files on error', async () => {
      const filePath = '/temp/test.jpg';
      mockStorageService.saveFile.mockResolvedValue(filePath);
      mockPdfProcessor.isPdf.mockRejectedValue(new Error('Processing failed'));

      await expect(service.extractFromFile(mockFile)).rejects.toThrow('Processing failed');

      expect(storageService.deleteFile).toHaveBeenCalledWith(filePath);
    });
  });

  describe('extractFromMultipleFiles', () => {
    it('should process multiple files successfully', async () => {
      const files = [mockFile, mockFile];

      mockStorageService.saveFile.mockResolvedValue('/temp/test.jpg');
      mockPdfProcessor.isPdf.mockResolvedValue(false);
      mockLocalOcrProvider.processImage.mockResolvedValue({
        text: 'Sample text',
        confidence: 0.95,
      });
      mockDocumentDetector.detectDocumentType.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        rawText: 'Sample text',
      });
      mockSchemaExtractor.extractSchema.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        schema: {},
        rawText: 'Sample text',
      });

      const result = await service.extractFromMultipleFiles(files);

      expect(result.totalProcessed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failures', async () => {
      const files = [mockFile, mockFile];

      mockStorageService.saveFile
        .mockResolvedValueOnce('/temp/test1.jpg')
        .mockRejectedValueOnce(new Error('Storage failed'));

      mockPdfProcessor.isPdf.mockResolvedValue(false);
      mockLocalOcrProvider.processImage.mockResolvedValue({
        text: 'Sample text',
        confidence: 0.95,
      });
      mockDocumentDetector.detectDocumentType.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        rawText: 'Sample text',
      });
      mockSchemaExtractor.extractSchema.mockReturnValue({
        documentType: DocumentType.INVOICE,
        confidence: 0.9,
        schema: {},
        rawText: 'Sample text',
      });

      const result = await service.extractFromMultipleFiles(files);

      expect(result.totalProcessed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when model is available', async () => {
      mockLocalOcrProvider.isAvailable.mockResolvedValue(true);

      const result = await service.checkHealth();

      expect(result.status).toBe('ok');
      expect(result.modelAvailable).toBe(true);
      expect(result.ocrMode).toBe('local');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when model is not available', async () => {
      mockLocalOcrProvider.isAvailable.mockResolvedValue(false);

      const result = await service.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.modelAvailable).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockLocalOcrProvider.isAvailable.mockRejectedValue(new Error('Check failed'));

      const result = await service.checkHealth();

      expect(result.status).toBe('error');
      expect(result.modelAvailable).toBe(false);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', () => {
      mockStorageService.getAllowedFileTypes.mockReturnValue(['jpg', 'jpeg', 'png', 'pdf']);
      mockStorageService.getMaxFileSizeMB.mockReturnValue(10);

      const result = service.getSupportedFormats();

      expect(result.supportedFileTypes).toEqual(['jpg', 'jpeg', 'png', 'pdf']);
      expect(result.maxFileSizeMB).toBe(10);
      expect(result.supportedDocumentTypes).toContain(DocumentType.INVOICE);
      expect(result.exampleSchemas).toHaveProperty('invoice');
      expect(result.exampleSchemas).toHaveProperty('receipt');
    });
  });
});
