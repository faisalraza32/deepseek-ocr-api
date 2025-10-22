import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
    private readonly tempDir: string;
    private readonly maxFileSizeMB: number;
    private readonly allowedFileTypes: string[];

    constructor(private readonly configService: ConfigService) {
        this.tempDir = this.configService.get<string>('TEMP_DIR', './temp');
        this.maxFileSizeMB = Number.parseInt(
            this.configService.get<string>('MAX_FILE_SIZE_MB', '10'),
        );
        const types = this.configService.get<string>(
            'ALLOWED_FILE_TYPES',
            'jpg,jpeg,png,pdf',
        );
        this.allowedFileTypes = types.split(',').map((t) => t.trim().toLowerCase());
    }

    private async ensureTempDirectory() {
        if (!existsSync(this.tempDir)) {
            await fs.mkdir(this.tempDir, { recursive: true });
        }
    }

    validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Check file size
        const fileSizeInMB = file.size / (1024 * 1024);
        if (fileSizeInMB > this.maxFileSizeMB) {
            throw new BadRequestException(
                `File size exceeds maximum allowed size of ${this.maxFileSizeMB}MB`,
            );
        }

        // Check file type
        const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
        if (!this.allowedFileTypes.includes(fileExtension)) {
            throw new BadRequestException(
                `File type .${fileExtension} is not allowed. Allowed types: ${this.allowedFileTypes.join(', ')}`,
            );
        }
    }

    async saveFile(file: Express.Multer.File): Promise<string> {
        await this.ensureTempDirectory();
        this.validateFile(file);

        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(this.tempDir, uniqueFilename);

        await fs.writeFile(filePath, file.buffer);
        return filePath;
    }

    async deleteFile(filePath: string): Promise<void> {
        try {
            if (existsSync(filePath)) {
                await fs.unlink(filePath);
            }
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
        }
    }

    async deleteFiles(filePaths: string[]): Promise<void> {
        await Promise.all(filePaths.map((filePath) => this.deleteFile(filePath)));
    }

    async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
        try {
            await this.ensureTempDirectory();
            const files = await fs.readdir(this.tempDir);
            const now = Date.now();
            const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = await fs.stat(filePath);
                const fileAge = now - stats.mtimeMs;

                if (fileAge > maxAgeMs) {
                    await this.deleteFile(filePath);
                }
            }
        } catch (error) {
            console.error('Error cleaning up old files:', error);
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

