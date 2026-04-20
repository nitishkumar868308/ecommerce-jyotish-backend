import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      where: { deleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, deleted: false },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async create(dto: CreateTagDto) {
    const slug = await this.uniqueSlug(dto.slug ?? slugify(dto.name));
    return this.prisma.tag.create({ data: { ...dto, slug } });
  }

  async update(id: number, dto: UpdateTagDto) {
    await this.findOne(id);

    // If name changed and admin didn't supply a slug, regenerate; still
    // enforce uniqueness ignoring the current row.
    const next: UpdateTagDto = { ...dto };
    if (dto.name || dto.slug) {
      const base = dto.slug || (dto.name ? slugify(dto.name) : undefined);
      if (base) {
        next.slug = await this.uniqueSlug(base, id);
      }
    }
    return this.prisma.tag.update({ where: { id }, data: next });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.tag.update({
      where: { id },
      data: { deleted: true },
    });
  }

  /**
   * Returns a slug guaranteed unique in the table, optionally ignoring a
   * given id (for update). Appends `-2`, `-3`, ... on collision. Falls back
   * to a timestamp if we somehow exceed 50 tries.
   */
  private async uniqueSlug(base: string, ignoreId?: number): Promise<string> {
    const seed = base || 'tag';
    let candidate = seed;
    for (let i = 0; i < 50; i++) {
      const hit = await this.prisma.tag.findUnique({
        where: { slug: candidate },
      });
      if (!hit || hit.id === ignoreId) return candidate;
      candidate = `${seed}-${i + 2}`;
    }
    return `${seed}-${Date.now()}`;
  }
}
