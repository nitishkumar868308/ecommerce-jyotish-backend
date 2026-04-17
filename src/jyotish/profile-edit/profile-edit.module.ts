import { Module } from '@nestjs/common';
import { ProfileEditController } from './profile-edit.controller';
import { ProfileEditService } from './profile-edit.service';

@Module({
  controllers: [ProfileEditController],
  providers: [ProfileEditService],
  exports: [ProfileEditService],
})
export class ProfileEditModule {}
