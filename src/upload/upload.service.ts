import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';

@Injectable()
export class UploadService {
  // Files are written to <cwd>/public/uploads/<folder>/<filename> and served
  // back at /uploads/<folder>/<filename> via Nest's static assets middleware.
  private readonly rootDir = join(process.cwd(), 'public', 'uploads');

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('No file received');
    }

    const safeFolder = this.sanitiseFolder(folder);
    const dir = join(this.rootDir, safeFolder);
    await fs.mkdir(dir, { recursive: true });

    const ext = extname(file.originalname || '').toLowerCase() || '.bin';
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    const absolutePath = join(dir, filename);

    await fs.writeFile(absolutePath, file.buffer);

    const publicId = `${safeFolder}/${filename}`;
    return {
      url: `/uploads/${publicId}`,
      publicId,
    };
  }

  // Strip anything outside a-zA-Z0-9/-_ so callers can't escape the root dir.
  private sanitiseFolder(folder?: string): string {
    if (!folder) return 'misc';
    const cleaned = folder.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 40);
    return cleaned || 'misc';
  }
}
