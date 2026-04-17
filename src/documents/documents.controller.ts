import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateVerificationDocumentDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all verification documents (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll() {
    const data = await this.documentsService.findAllVerification();
    return { success: true, data };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Upload a verification document' })
  async create(@Body() dto: CreateVerificationDocumentDto) {
    const data = await this.documentsService.createVerification(dto);
    return { success: true, message: 'Document uploaded', data };
  }

  @Get('extra')
  @ApiOperation({ summary: 'Get all extra documents (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAllExtra() {
    const data = await this.documentsService.findAllExtra();
    return { success: true, data };
  }
}
