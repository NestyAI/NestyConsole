import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENCRYPTION_PREFIX = "v1";

function getRawSecret(): string | null {
  const value = process.env.NESTY_CONSOLE_CREDENTIALS_SECRET?.trim();
  return value || null;
}

function getKeyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function isCredentialsSecretConfigured(): boolean {
  return Boolean(getRawSecret());
}

export function encryptSecret(plainText: string): string {
  const secret = getRawSecret();
  if (!secret) {
    throw new Error("credentials_secret_missing");
  }

  const iv = randomBytes(12);
  const key = getKeyFromSecret(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const secret = getRawSecret();
  if (!secret) {
    throw new Error("credentials_secret_missing");
  }

  const [prefix, ivBase64, tagBase64, encryptedBase64] = payload.split(":");
  if (prefix !== ENCRYPTION_PREFIX || !ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("credentials_payload_invalid");
  }

  const key = getKeyFromSecret(secret);
  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}
