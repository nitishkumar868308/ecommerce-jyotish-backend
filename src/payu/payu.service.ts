import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Shape of a launch payload returned from {@link PayuService.buildLaunchPayload}.
 * The frontend posts `params` to `actionUrl` as a self-submitting HTML
 * form — same as PayU's standard integration.
 */
export interface PayuLaunchPayload {
  gateway: 'payu';
  actionUrl: string;
  params: {
    key: string;
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
    phone: string;
    surl: string;
    furl: string;
    hash: string;
    udf1: string;
    udf2: string;
    udf3: string;
    udf4: string;
    udf5: string;
  };
}

interface BuildArgs {
  txnid: string;
  amount: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

@Injectable()
export class PayuService {
  private get key(): string {
    const v = process.env.PAYU_KEY;
    if (!v) {
      throw new InternalServerErrorException(
        'PAYU_KEY is not configured — set it in the backend env before accepting card payments.',
      );
    }
    return v;
  }
  private get salt(): string {
    const v = process.env.PAYU_SALT;
    if (!v) {
      throw new InternalServerErrorException(
        'PAYU_SALT is not configured — set it in the backend env before accepting card payments.',
      );
    }
    return v;
  }
  private get mode(): 'production' | 'test' {
    return (process.env.PAYU_MODE ?? 'test').toLowerCase() === 'production'
      ? 'production'
      : 'test';
  }
  private get actionUrl(): string {
    return this.mode === 'production'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment';
  }

  /**
   * Assemble the launch payload (action URL + form params + request hash)
   * that the frontend will auto-submit to PayU.
   *
   * Hash formula (per PayU docs):
   *   sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
   */
  buildLaunchPayload(args: BuildArgs): PayuLaunchPayload {
    const key = this.key;
    const salt = this.salt;
    const udf1 = args.udf1 ?? '';
    const udf2 = args.udf2 ?? '';
    const udf3 = args.udf3 ?? '';
    const udf4 = args.udf4 ?? '';
    const udf5 = args.udf5 ?? '';
    // PayU expects the amount as a plain string; trailing zeros optional
    // but we keep two decimals so the hash is stable across locales.
    const amount = args.amount.toFixed(2);

    const hashString = `${key}|${args.txnid}|${amount}|${args.productInfo}|${args.firstName}|${args.email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    const hash = createHash('sha512').update(hashString).digest('hex');

    return {
      gateway: 'payu',
      actionUrl: this.actionUrl,
      params: {
        key,
        txnid: args.txnid,
        amount,
        productinfo: args.productInfo,
        firstname: args.firstName,
        email: args.email,
        phone: args.phone,
        surl: args.surl,
        furl: args.furl,
        hash,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
      },
    };
  }

  /**
   * Server-to-server call to PayU's `verify_payment` endpoint. We use
   * this when the browser-side callback didn't reach us (e.g. the
   * shopper closed the tab after clicking "Cancel" on secure.payu.in
   * so PayU never POSTed to `furl`, or our backend wasn't publicly
   * reachable during dev). Returned shape:
   *   { status: 'success' | 'failure' | 'cancel' | ...,
   *     amount, mihpayid, error_Message?, ... }
   */
  async verifyTransaction(
    txnid: string,
  ): Promise<Record<string, unknown> | null> {
    const key = this.key;
    const salt = this.salt;
    const command = 'verify_payment';
    const hash = createHash('sha512')
      .update(`${key}|${command}|${txnid}|${salt}`)
      .digest('hex');

    // PayU's verify endpoint is a separate host from the checkout URL.
    const base =
      this.mode === 'production'
        ? 'https://info.payu.in/merchant/postservice.php?form=2'
        : 'https://test.payu.in/merchant/postservice.php?form=2';

    const body = new URLSearchParams({
      key,
      command,
      var1: txnid,
      hash,
    });

    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as any;
      // Response shape: { status: 1, msg: 'Transaction Fetched successfully',
      //   transaction_details: { [txnid]: {...} } }
      const details = json?.transaction_details?.[txnid];
      return details ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Validate the response hash PayU echoes back on success / failure.
   * Reverse of the request hash — anyone posting to our webhook has to
   * know the salt, so this rejects forged success callbacks.
   *
   * Formula:
   *   sha512(salt|status|||||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
   */
  verifyResponseHash(params: Record<string, string>): boolean {
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash: respHash,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
    } = params;

    if (!respHash || !txnid || !status) return false;

    const base = `${this.salt}|${status}|||||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    const expected = createHash('sha512').update(base).digest('hex');
    return expected.toLowerCase() === String(respHash).toLowerCase();
  }
}
