import { Global, Module } from '@nestjs/common';
import { PayGlocalService } from './payglocal.service';

// Global so orders / wallet can inject without plumbing imports. Matches
// how PayuModule is wired — keeps payment-gateway boilerplate light.
@Global()
@Module({
  providers: [PayGlocalService],
  exports: [PayGlocalService],
})
export class PayGlocalModule {}
