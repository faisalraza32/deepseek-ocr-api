import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { StorageService } from './storage.service';

jest.mock('node:fs/promises');
jest.mock('node:fs');

describe('StorageService', () => {
  let service: StorageService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        TEMP_DIR: './temp',
        MAX_FILE_SIZE_MB: '10',
        ALLOWED_FILE_TYPES: 'jpg,jpeg,png,pdf',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test data'),
    stream: null,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    it('should validate a valid file', () => {
      expect(() => service.validateFile(mockFile)).not.toThrow();
    });

    it('should throw error when no file is provided', () => {
      expect(() => service.validateFile(null)).toThrow(BadRequestException);
      expect(() => service.validateFile(null)).toThrow('No file uploaded');
    });

    it('should throw error when file exceeds size limit', () => {
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 }; // 11MB

      expect(() => service.validateFile(largeFile)).toThrow(BadRequestException);
      expect(() => service.validateFile(largeFile)).toThrow(
        'File size exceeds maximum allowed size',
      );
    });

    it('should throw error for unsupported file type', () => {
      const invalidFile = { ...mockFile, originalname: 'test.txt' };

      expect(() => service.validateFile(invalidFile)).toThrow(BadRequestException);
      expect(() => service.validateFile(invalidFile)).toThrow('File type .txt is not allowed');
    });

    it('should accept all supported file types', () => {
      const supportedTypes = ['test.jpg', 'test.jpeg', 'test.png', 'test.pdf'];

      supportedTypes.forEach((filename) => {
        const file = { ...mockFile, originalname: filename };
        expect(() => service.validateFile(file)).not.toThrow();
      });
    });
  });

  describe('saveFile', () => {
    it('should save file successfully', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const filePath = await service.saveFile(mockFile);

      expect(filePath).toContain('temp');
      expect(filePath).toContain('.pdf');
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, mockFile.buffer);
    });

    it('should create temp directory if it does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.saveFile(mockFile);

      expect(fs.mkdir).toHaveBeenCalledWith('./temp', { recursive: true });
    });

    it('should validate file before saving', async () => {
      const invalidFile = { ...mockFile, originalname: 'test.txt' };

      await expect(service.saveFile(invalidFile)).rejects.toThrow(BadRequestException);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteFile('/temp/test.pdf');

      expect(fs.unlink).toHaveBeenCalledWith('/temp/test.pdf');
    });

    it('should not throw error if file does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deleteFile('/temp/nonexistent.pdf')).resolves.not.toThrow();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.deleteFile('/temp/test.pdf')).resolves.not.toThrow();
    });
  });

  describe('deleteFiles', () => {
    it('should delete multiple files', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const files = ['/temp/test1.pdf', '/temp/test2.pdf', '/temp/test3.pdf'];

      await service.deleteFiles(files);

      expect(fs.unlink).toHaveBeenCalledTimes(3);
    });
  });

  describe('cleanupOldFiles', () => {
    it('should delete files older than specified hours', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdir as jest.Mock).mockResolvedValue(['old-file.pdf', 'new-file.pdf']);

      const now = Date.now();
      const oldFileTime = now - 25 * 60 * 60 * 1000; // 25 hours ago
      const newFileTime = now - 1 * 60 * 60 * 1000; // 1 hour ago

      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({ mtimeMs: oldFileTime })
        .mockResolvedValueOnce({ mtimeMs: newFileTime });

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.cleanupOldFiles(24);

      expect(fs.unlink).toHaveBeenCalledTimes(1);
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('temp/old-file.pdf'));
    });

    it('should handle cleanup errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Read error'));

      await expect(service.cleanupOldFiles(24)).resolves.not.toThrow();
    });
  });

  describe('getFileExtension', () => {
    it('should return file extension without dot', () => {
      expect(service.getFileExtension('test.pdf')).toBe('pdf');
      expect(service.getFileExtension('image.jpg')).toBe('jpg');
      expect(service.getFileExtension('document.PDF')).toBe('pdf');
    });
  });

  describe('getAllowedFileTypes', () => {
    it('should return array of allowed file types', () => {
      const types = service.getAllowedFileTypes();

      expect(types).toEqual(['jpg', 'jpeg', 'png', 'pdf']);
      expect(Array.isArray(types)).toBe(true);
    });
  });

  describe('getMaxFileSizeMB', () => {
    it('should return max file size in MB', () => {
      expect(service.getMaxFileSizeMB()).toBe(10);
    });
  });
});
