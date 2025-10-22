import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly tempDir: string;
  private readonly maxFileSizeMB: number;
  private readonly allowedFileTypes: string[];

  constructor(private readonly configService: ConfigService) {
    this.tempDir = this.configService.get<string>('TEMP_DIR', './temp');
    this.maxFileSizeMB = Number.parseInt(this.configService.get<string>('MAX_FILE_SIZE_MB', '10'));
    const types = this.configService.get<string>('ALLOWED_FILE_TYPES', 'jpg,jpeg,png,pdf');
    this.allowedFileTypes = types.split(',').map((t) => t.trim().toLowerCase());

    this.logger.log(
      `Storage Service initialized - Temp dir: ${this.tempDir}, Max size: ${this.maxFileSizeMB}MB, Allowed types: ${this.allowedFileTypes.join(', ')}`,
    );
  }

  private async ensureTempDirectory() {
    if (!existsSync(this.tempDir)) {
      this.logger.debug(`Creating temporary directory: ${this.tempDir}`);
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      this.logger.warn('File validation failed: No file provided');
      throw new BadRequestException('No file uploaded');
    }

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > this.maxFileSizeMB) {
      this.logger.warn(
        `File validation failed: ${file.originalname} exceeds size limit (${fileSizeInMB.toFixed(2)}MB > ${this.maxFileSizeMB}MB)`,
      );
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSizeMB}MB`,
      );
    }

    // Check file type
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!this.allowedFileTypes.includes(fileExtension)) {
      this.logger.warn(
        `File validation failed: ${file.originalname} has unsupported type .${fileExtension}`,
      );
      throw new BadRequestException(
        `File type .${fileExtension} is not allowed. Allowed types: ${this.allowedFileTypes.join(', ')}`,
      );
    }

    this.logger.debug(
      `File validated: ${file.originalname} (${fileSizeInMB.toFixed(2)}MB, .${fileExtension})`,
    );
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    await this.ensureTempDirectory();
    this.validateFile(file);

    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.tempDir, uniqueFilename);

    this.logger.debug(`Saving file ${file.originalname} to ${filePath}`);
    await fs.writeFile(filePath, file.buffer);
    this.logger.debug(`File saved successfully: ${filePath}`);

    return filePath;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        this.logger.debug(`Deleting file: ${filePath}`);
        await fs.unlink(filePath);
      }
    } catch (error) {
      this.logger.error(`Error deleting file ${filePath}: ${error.message}`, error.stack);
    }
  }

  async deleteFiles(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map((filePath) => this.deleteFile(filePath)));
  }

  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      this.logger.debug(`Starting cleanup of files older than ${maxAgeHours} hours`);
      await this.ensureTempDirectory();
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleanup completed: deleted ${deletedCount} old file(s)`);
      } else {
        this.logger.debug('Cleanup completed: no old files to delete');
      }
    } catch (error) {
      this.logger.error(`Error cleaning up old files: ${error.message}`, error.stack);
    }
  }

  getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase().slice(1);
  }

  getAllowedFileTypes(): string[] {
    return [...this.allowedFileTypes];
  }

  getMaxFileSizeMB(): number {
    return this.maxFileSizeMB;
  }
}
