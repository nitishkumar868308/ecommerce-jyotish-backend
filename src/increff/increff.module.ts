import { Module } from '@nestjs/common';
import { IncreffService } from './increff.service';
import { IncreffController } from './increff.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [IncreffService, PrismaService],
  controllers: [IncreffController],
  exports: [IncreffService],
})
export class IncreffModule {}
