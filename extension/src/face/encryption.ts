/**
 * AES-GCM encryption with PBKDF2-derived keys.
 * All inputs/outputs are Base64 strings.
 */

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_LENGTH = 256;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function getCrypto(): Crypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto is not available in this context");
  }
  return crypto;
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
  // Force a fresh ArrayBuffer to satisfy strict BufferSource typing.
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

async function deriveKey(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const c = getCrypto();
  const pinBuf = toBuffer(new TextEncoder().encode(pin));
  const baseKey = await c.subtle.importKey(
    "raw",
    pinBuf,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return c.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

function embeddingToBytes(embedding: number[]): Uint8Array {
  const buf = new ArrayBuffer(embedding.length * 4);
  const view = new Float32Array(buf);
  for (let i = 0; i < embedding.length; i++) {
    view[i] = embedding[i];
  }
  return new Uint8Array(buf);
}

function bytesToEmbedding(bytes: Uint8Array): number[] {
  // Re-align to a fresh buffer in case of byte offset.
  const aligned = new Uint8Array(bytes);
  const view = new Float32Array(aligned.buffer);
  return Array.from(view);
}

export interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  salt: string;
}

export async function encryptEmbedding(
  embedding: number[],
  pin: string
): Promise<EncryptedPayload> {
  const c = getCrypto();
  const salt = c.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = c.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(pin, salt);

  const data = embeddingToBytes(embedding);
  const cipher = await c.subtle.encrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    toBuffer(data)
  );

  return {
    encryptedData: bytesToBase64(new Uint8Array(cipher)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

export async function decryptEmbedding(
  encryptedData: string,
  iv: string,
  salt: string,
  pin: string
): Promise<number[]> {
  const c = getCrypto();
  const saltBytes = base64ToBytes(salt);
  const ivBytes = base64ToBytes(iv);
  const cipherBytes = base64ToBytes(encryptedData);

  const key = await deriveKey(pin, saltBytes);
  let plain: ArrayBuffer;
  try {
    plain = await c.subtle.decrypt(
      { name: "AES-GCM", iv: toBuffer(ivBytes) },
      key,
      toBuffer(cipherBytes)
    );
  } catch {
    throw new Error("Incorrect PIN or corrupted face data");
  }
  return bytesToEmbedding(new Uint8Array(plain));
}
