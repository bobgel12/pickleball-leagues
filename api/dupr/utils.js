import crypto from 'crypto';

export function getBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto ? String(forwardedProto).split(',')[0] : 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function signState(payload, secret) {
  const json = JSON.stringify(payload);
  const base = Buffer.from(json).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(base).digest('base64url');
  return `${base}.${sig}`;
}

export function verifyState(state, secret) {
  if (!state || typeof state !== 'string' || !state.includes('.')) {
    return null;
  }
  const [base, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', secret).update(base).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const json = Buffer.from(base, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
