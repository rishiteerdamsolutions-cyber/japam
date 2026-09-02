const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Client-side preview codes for the admin form. Server re-validates uniqueness. */
export function generateSatsangCodePreview(len = 6): string {
  let out = '';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}
