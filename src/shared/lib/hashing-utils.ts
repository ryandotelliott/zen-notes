import { sortObjectKeys } from './sorting-utils';

export async function hashStringSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const byteHex = bytes[i].toString(16).padStart(2, '0');
    hex += byteHex;
  }
  return hex;
}

export async function hashJsonStable(value: unknown): Promise<string> {
  const sorted = sortObjectKeys(value as Record<string, unknown>);
  return hashStringSHA256(JSON.stringify(sorted));
}
