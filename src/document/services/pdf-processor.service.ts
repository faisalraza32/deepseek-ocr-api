import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { v4 as uuidv4 } from 'uuid';

const execPromise = promisify(exec);

@Injectable()
export class PdfProcessorService {
    private readonly tempDir: string;

    constructor(private readonly configService: ConfigService) {
        this.tempDir = this.configService.get<string>('TEMP_DIR', './temp');
    }

    async convertPdfToImages(pdfPath: string): Promise<string[]> {
        const outputDir = path.join(
            this.tempDir,
            `pdf_${uuidv4()}`,
        );

        try {
            // Create output directory
            await fs.mkdir(outputDir, { recursive: true });

            // Use pdftoppm (from poppler-utils) to convert PDF to images
            // Format: pdftoppm -png input.pdf output_prefix
            const outputPrefix = path.join(outputDir, 'page');
            const command = `pdftoppm -png "${pdfPath}" "${outputPrefix}"`;

            try {
                await execPromise(command);
            } catch {
                // If pdftoppm is not available, try using ImageMagick convert as fallback
                const fallbackCommand = `convert -density 300 "${pdfPath}" "${outputPrefix}-%d.png"`;
                await execPromise(fallbackCommand);
            }

            // Get all generated image files
            const files = await fs.readdir(outputDir);
            const imagePaths = files
                .filter((file) => file.endsWith('.png'))
                .sort()
                .map((file) => path.join(outputDir, file));

            if (imagePaths.length === 0) {
                throw new Error('No images were generated from PDF');
            }

            return imagePaths;
        } catch (error) {
            // Clean up on error
            if (existsSync(outputDir)) {
                await fs.rm(outputDir, { recursive: true, force: true });
            }
            throw new InternalServerErrorException(
                `Failed to convert PDF to images: ${error.message}`,
            );
        }
    }

    async isPdf(filePath: string): Promise<boolean> {
        const extension = path.extname(filePath).toLowerCase();
        return extension === '.pdf';
    }
}

