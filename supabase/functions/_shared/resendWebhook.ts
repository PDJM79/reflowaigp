// supabase/functions/_shared/resendWebhook.ts
// Svix signature verification for Resend webhooks

import { Webhook } from 'https://esm.sh/svix@1.41.0';

/**
 * Verify Resend webhook signature using Svix
 * Returns the raw payload text for parsing after verification
 */
export const verifyResendSvix = async (req: Request): Promise<string> => {
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!secret) {
    throw new Error('Missing RESEND_WEBHOOK_SECRET');
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing Svix signature headers');
  }

  // IMPORTANT: read body as text for signature verification
  const payload = await req.text();

  const wh = new Webhook(secret);
  
  // Throws if signature is invalid
  wh.verify(payload, {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  });

  return payload;
};
