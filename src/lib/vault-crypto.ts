import { fromBase64Url, randomBytes, toBase64Url } from "@/lib/secret-split";

/**
 * Zero-knowledge vault encryption. The vault key is derived from the user's
 * passphrase via PBKDF2 and never leaves whatever process derived it - the
 * server only ever sees ciphertext, salts, and (transiently, in memory,
 * during a verified trigger) a key it reconstructed from two independent
 * shares. See secret-split.ts for how the key is split for the trigger flow.
 *
 * These functions are plain Web Crypto (`crypto.subtle`), which is
 * available both in the browser and in Node - so the exact same code
 * derives/encrypts client-side at compose time and reconstructs/decrypts
 * server-side once a verifier has supplied their share.
 */

const PBKDF2_ITERATIONS = 250_000;
export const VAULT_CANARY_PLAINTEXT = "LEGACY-NOTES-VAULT-OK";

// Node's lib.dom.d.ts types Uint8Array as generic over ArrayBufferLike, while
// Web Crypto's BufferSource wants one pinned to ArrayBuffer. Both runtimes
// accept a plain Uint8Array at, well, runtime - this cast just satisfies tsc.
function bs(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

export function newSalt(): string {
  return toBase64Url(randomBytes(16));
}

export async function deriveVaultKeyRaw(passphrase: string, saltB64: string): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: bs(fromBase64Url(saltB64)), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    256,
  );
  return new Uint8Array(bits);
}

async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bs(rawKey), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptWithKey(
  rawKey: Uint8Array,
  plaintext: string,
): Promise<{ iv: string; cipherText: string }> {
  const key = await importAesKey(rawKey);
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, key, new TextEncoder().encode(plaintext));
  return { iv: toBase64Url(iv), cipherText: toBase64Url(new Uint8Array(cipher)) };
}

/** Returns null instead of throwing when the key is wrong - callers use this to validate a reconstructed key. */
export async function decryptWithKey(rawKey: Uint8Array, ivB64: string, cipherTextB64: string): Promise<string | null> {
  try {
    const key = await importAesKey(rawKey);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bs(fromBase64Url(ivB64)) },
      key,
      bs(fromBase64Url(cipherTextB64)),
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

export async function makeCanary(rawKey: Uint8Array) {
  return encryptWithKey(rawKey, VAULT_CANARY_PLAINTEXT);
}

export async function verifyCanary(rawKey: Uint8Array, iv: string, cipherText: string): Promise<boolean> {
  const plain = await decryptWithKey(rawKey, iv, cipherText);
  return plain === VAULT_CANARY_PLAINTEXT;
}
