import { Global, Module } from '@nestjs/common';
import { PayuService } from './payu.service';

// Global so any module (orders, payments, admin adjustments) can inject
// the service without plumbing imports one-by-one.
@Global()
@Module({
  providers: [PayuService],
  exports: [PayuService],
})
export class PayuModule {}
