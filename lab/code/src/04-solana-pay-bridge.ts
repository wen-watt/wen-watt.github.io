// Model 4: a payment bridge for e-commerce. The shop creates a Solana Pay link/QR for an order,
// watches the chain for the payment by its unique reference, validates amount and token,
// then notifies its own order system (the same role a card acquirer's callback plays).
// License: Apache-2.0. Example code, not audited. Devnet first. Built on @solana/pay + @solana/kit.
import { encodeURL, findReference, validateTransfer, FindReferenceError } from '@solana/pay';
import { address, createSolanaRpc, generateKeyPairSigner, type Address } from '@solana/kit';

/** Tokens a shop may accept. USDC for stable prices; $WEN as an optional community payment. */
export const ACCEPTED = {
  USDC_MAINNET: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  WEN_MAINNET: address('WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk'),
} as const;

export interface PaymentRequest {
  orderId: string;
  recipient: Address;      // the shop's wallet
  amount: number;          // in token units, e.g. 24.99
  splToken?: Address;      // omit for SOL
  reference: Address;      // unique per order: how the shop finds the payment
  url: string;             // solana: URL to show as a link or QR
}

export async function createPaymentRequest(orderId: string, recipient: Address, amount: number, splToken?: Address): Promise<PaymentRequest> {
  const reference = (await generateKeyPairSigner()).address;   // random, never reused
  const url = encodeURL({
    recipient, amount, splToken, reference,
    label: 'Wen Open Lab demo shop',
    message: `Order ${orderId}`,
    memo: `order:${orderId}`,
  });
  return { orderId, recipient, amount, splToken, reference, url: url.toString() };
}

/** Poll until the payment appears, then validate it and call the shop's webhook. */
export async function waitForPayment(req: PaymentRequest, opts: { rpcUrl: string; webhook: string; timeoutMs?: number }) {
  const rpc = createSolanaRpc(opts.rpcUrl);
  const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60_000);
  while (Date.now() < deadline) {
    try {
      const found = await findReference(rpc, req.reference, { commitment: 'confirmed' });
      // Throws if recipient, amount, token, reference or memo do not match the request.
      await validateTransfer(rpc, found.signature, {
        recipient: req.recipient, amount: req.amount, splToken: req.splToken, reference: req.reference, memo: `order:${req.orderId}`,
      }, { commitment: 'confirmed' });
      await fetch(opts.webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: req.orderId, status: 'paid', signature: found.signature }),
      });
      return found.signature;
    } catch (e) {
      if (!(e instanceof FindReferenceError)) throw e;   // not found yet: keep waiting
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw new Error(`Order ${req.orderId}: payment not found before timeout`);
}
