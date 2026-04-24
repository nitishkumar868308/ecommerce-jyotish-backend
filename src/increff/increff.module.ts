import { Module } from '@nestjs/common';
import { IncreffService } from './increff.service';
import { IncreffController } from './increff.controller';
import { BangaloreInventoryController } from './bangalore-inventory.controller';
import { BangaloreInventoryService } from './bangalore-inventory.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [IncreffService, BangaloreInventoryService, PrismaService],
  controllers: [IncreffController, BangaloreInventoryController],
  exports: [IncreffService],
})
export class IncreffModule {}
