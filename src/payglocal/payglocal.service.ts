import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash, createPrivateKey, createSign } from 'crypto';

/**
 * Launch payload returned from {@link PayGlocalService.initiatePayment}.
 * Unlike PayU (self-submitting HTML form), PayGlocal gives back a hosted
 * payment URL we just redirect the shopper to.
 */
export interface PayGlocalLaunchPayload {
  gateway: 'payglocal';
  /** Hosted-page URL the frontend should redirect the shopper to. */
  redirectUrl: string;
  merchantTxnId: string;
}

interface InitiateArgs {
  /** Our own order-level transaction id (we reuse the order number). */
  merchantTxnId: string;
  /** Total already in the shopper's currency — no further conversion needed. */
  amount: number;
  /** ISO 4217 code in the shopper's currency, e.g. `USD`, `AED`, `INR`. */
  currency: string;
  /** Shopper name / email / phone for PayGlocal's KYC block. */
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  /** URL PayGlocal bounces the shopper back to after success. */
  redirectUrl: string;
  /** URL PayGlocal POSTs the final status to (server-to-server). */
  statusUrl: string;
  /** Platform label so we can theme the success page correctly. */
  platform?: string;
}

/**
 * PayGlocal (J-Wallet) gateway adapter. International cards only — we
 * route shoppers here when their storefront country isn't India (PayU
 * handles domestic INR). PayGlocal uses RS256-signed JWS on the
 * `x-gl-token-external` header; the request body itself stays plain
 * JSON. We keep the gateway call server-side so the shopper never sees
 * our private key material.
 */
@Injectable()
export class PayGlocalService {
  private readonly logger = new Logger(PayGlocalService.name);

  private get merchantId(): string {
    const v = process.env.PAYGLOCAL_MERCHANT_ID;
    if (!v) {
      throw new InternalServerErrorException(
        'PAYGLOCAL_MERCHANT_ID is not configured.',
      );
    }
    return v;
  }

  private get privateKeyPem(): string {
    const raw = process.env.PAYGLOCAL_PRIVATE_KEY;
    if (!raw) {
      throw new InternalServerErrorException(
        'PAYGLOCAL_PRIVATE_KEY is not configured.',
      );
    }
    // The key is stored in the env file with escaped newlines (\n) so
    // dotenv reads a single line. Convert them back to real newlines so
    // Node's crypto layer can parse the PEM.
    return raw.replace(/\\n/g, '\n');
  }

  private get privateKeyId(): string {
    const v = process.env.PAYGLOCAL_PRIVATE_KEY_ID;
    if (!v) {
      throw new InternalServerErrorException(
        'PAYGLOCAL_PRIVATE_KEY_ID is not configured.',
      );
    }
    return v;
  }

  private get mode(): 'production' | 'uat' {
    return (process.env.PAYGLOCAL_MODE ?? 'uat').toLowerCase() === 'production'
      ? 'production'
      : 'uat';
  }

  /**
   * PayGlocal has two hostnames — UAT for sandbox testing and prod for
   * real cards. Kept behind a getter so we can flip with an env var.
   */
  private get initiateUrl(): string {
    return this.mode === 'production'
      ? 'https://api.prod.payglocal.in/gl/v1/payments/initiate'
      : 'https://api.uat.payglocal.in/gl/v1/payments/initiate';
  }

  /**
   * Initiate a PayGlocal transaction and return the hosted-page URL
   * the shopper should be redirected to. The amount we send MUST already
   * be in the shopper's currency (USD/AED/etc.) — PayGlocal does not
   * re-convert. We also snap to two decimals because the signer hashes
   * the serialized body, and any floating-point drift would break the
   * signature.
   */
  async initiatePayment(
    args: InitiateArgs,
  ): Promise<PayGlocalLaunchPayload> {
    // Build the JSON body PayGlocal expects. Shape mirrors PayGlocal's
    // GL API contract: `paymentData` carries the money, `merchantTxnId`
    // is the idempotency key we reuse on status callbacks.
    const body = {
      merchantTxnId: args.merchantTxnId,
      paymentData: {
        totalAmount: Number(args.amount).toFixed(2),
        txnCurrency: args.currency.toUpperCase(),
      },
      billingData: {
        firstName: args.firstName.slice(0, 50),
        lastName: (args.lastName ?? '').slice(0, 50),
        emailId: args.email,
        callingCode: '',
        phoneNumber: (args.phone ?? '').replace(/\D/g, ''),
      },
      merchantCallbackURL: args.redirectUrl,
      statusUrl: args.statusUrl,
      clientData: {
        platform: args.platform ?? 'wizard',
      },
    };

    const serialized = JSON.stringify(body);
    const jws = this.buildJwsToken(serialized);

    try {
      const res = await fetch(this.initiateUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gl-token-external': jws,
          'x-gl-merchantid': this.merchantId,
        },
        body: serialized,
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Non-JSON response usually means HTML error page from an edge
        // proxy — log the raw body so ops can read it.
      }

      if (!res.ok || !parsed) {
        this.logger.error(
          `PayGlocal initiate failed (${res.status}) for ${args.merchantTxnId}: ${text.slice(0, 500)}`,
        );
        throw new InternalServerErrorException(
          'Payment gateway did not accept the request. Please try again.',
        );
      }

      // PayGlocal response shape (trimmed to what we need):
      //   { gid, redirectUrl, status, ... }
      const redirectUrl: string | undefined =
        parsed.redirectUrl ??
        parsed.data?.redirectUrl ??
        parsed.data?.redirect_url ??
        parsed.data?.paymentLink;

      if (!redirectUrl) {
        this.logger.error(
          `PayGlocal initiate succeeded but no redirectUrl in response for ${args.merchantTxnId}: ${text.slice(0, 500)}`,
        );
        throw new InternalServerErrorException(
          'Payment gateway did not return a checkout link.',
        );
      }

      return {
        gateway: 'payglocal',
        redirectUrl,
        merchantTxnId: args.merchantTxnId,
      };
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(
        `PayGlocal initiate network error for ${args.merchantTxnId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new InternalServerErrorException(
        'Could not reach the payment gateway. Try again in a moment.',
      );
    }
  }

  /**
   * Build the RS256 JWS token PayGlocal expects on the
   * `x-gl-token-external` header. The payload carries a SHA-256 digest
   * of the request body so PayGlocal can detect tampering in transit.
   * Header carries our private-key id so they know which public key to
   * verify the signature against.
   */
  private buildJwsToken(serializedBody: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.privateKeyId,
      'x-gl-enc': 'false',
    };
    const digest = createHash('sha256').update(serializedBody).digest('hex');
    const payload = {
      digest,
      digestAlgorithm: 'SHA-256',
      iat: now * 1000, // PayGlocal docs want milliseconds here
      exp: 300000, // 5 minute TTL
    };

    const headerB64 = this.b64url(JSON.stringify(header));
    const payloadB64 = this.b64url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = createPrivateKey({
      key: this.privateKeyPem,
      format: 'pem',
    });
    const signature = createSign('RSA-SHA256')
      .update(signingInput)
      .sign(key)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `${signingInput}.${signature}`;
  }

  private b64url(input: string): string {
    return Buffer.from(input, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
