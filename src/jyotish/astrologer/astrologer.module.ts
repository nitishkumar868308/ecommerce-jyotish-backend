import { Module } from '@nestjs/common';
import { AstrologerController } from './astrologer.controller';
import { AstrologerService } from './astrologer.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  // Pull in AuthModule so JwtService (re-exported by AuthModule) is
  // injectable into AstrologerService.login() to mint astrologer JWTs.
  imports: [AuthModule],
  controllers: [AstrologerController],
  providers: [AstrologerService],
  exports: [AstrologerService],
})
export class AstrologerModule {}
