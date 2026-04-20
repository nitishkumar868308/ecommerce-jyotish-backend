import { PartialType } from '@nestjs/swagger';
import { CreateMarketLinkDto } from './create-market-link.dto';

export class UpdateMarketLinkDto extends PartialType(CreateMarketLinkDto) {}
