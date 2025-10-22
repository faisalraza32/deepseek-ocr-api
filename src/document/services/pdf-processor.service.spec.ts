import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { PdfProcessorService } from './pdf-processor.service';

jest.mock('node:child_process');
jest.mock('node:fs/promises');
jest.mock('node:fs');

describe('PdfProcessorService', () => {
  let service: PdfProcessorService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'TEMP_DIR') return './temp';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfProcessorService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<PdfProcessorService>(PdfProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isPdf', () => {
    it('should return true for PDF files', async () => {
      expect(await service.isPdf('/path/to/file.pdf')).toBe(true);
      expect(await service.isPdf('/path/to/file.PDF')).toBe(true);
    });

    it('should return false for non-PDF files', async () => {
      expect(await service.isPdf('/path/to/file.jpg')).toBe(false);
      expect(await service.isPdf('/path/to/file.png')).toBe(false);
      expect(await service.isPdf('/path/to/file.txt')).toBe(false);
    });
  });

  describe('convertPdfToImages', () => {
    it('should convert PDF to images successfully', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['page-1.png', 'page-2.png']);

      // Mock successful exec
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await service.convertPdfToImages('/path/to/test.pdf');

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('page-1.png');
      expect(result[1]).toContain('page-2.png');
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should use fallback command if pdftoppm fails', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['page-0.png']);

      const execMock = exec as unknown as jest.Mock;
      let callCount = 0;

      execMock.mockImplementation((cmd, callback) => {
        callCount++;
        if (callCount === 1) {
          // First call (pdftoppm) fails
          callback(new Error('pdftoppm not found'), { stdout: '', stderr: '' });
        } else {
          // Second call (ImageMagick) succeeds
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.convertPdfToImages('/path/to/test.pdf');

      expect(result).toHaveLength(1);
      expect(execMock).toHaveBeenCalledTimes(2);
    });

    it('should throw error if no images generated', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]); // No images

      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      await expect(service.convertPdfToImages('/path/to/test.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should cleanup on error', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => {
        callback(new Error('Conversion failed'), { stdout: '', stderr: '' });
        return {} as any;
      });

      await expect(service.convertPdfToImages('/path/to/test.pdf')).rejects.toThrow();

      // Should attempt both commands before failing
      expect(execMock).toHaveBeenCalledTimes(2);
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should sort image files correctly', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([
        'page-3.png',
        'page-1.png',
        'page-2.png',
        'not-an-image.txt',
      ]);

      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await service.convertPdfToImages('/path/to/test.pdf');

      expect(result).toHaveLength(3);
      expect(result[0]).toContain('page-1.png');
      expect(result[1]).toContain('page-2.png');
      expect(result[2]).toContain('page-3.png');
    });
  });
});
