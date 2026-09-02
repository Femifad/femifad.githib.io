/**
 * Two-of-two secret splitting for the vault key, via one-time-pad XOR.
 *
 * shareB is random bytes the length of the key; shareA = key XOR shareB.
 * Either share alone is information-theoretically meaningless - this is
 * what lets the server hold shareA (as `User.serverKeyShare`) without ever
 * being able to read a user's vault: reconstructing the key requires the
 * *other* share, which is only ever shown to the user once (to hand to
 * their verifier out of band) and is never stored anywhere.
 *
 * This runs identically in the browser (to split, at vault setup) and on
 * the server (to rejoin, when a verifier submits their share during the
 * trigger flow) - both environments expose the Web Crypto API globally.
 */

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) throw new Error("xorBytes: length mismatch");
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

export function splitSecret(secret: Uint8Array): { shareA: Uint8Array; shareB: Uint8Array } {
  const shareB = randomBytes(secret.length);
  const shareA = xorBytes(secret, shareB);
  return { shareA, shareB };
}

export function joinShares(shareA: Uint8Array, shareB: Uint8Array): Uint8Array {
  return xorBytes(shareA, shareB);
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}
