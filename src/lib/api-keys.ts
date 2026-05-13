import { createHash, randomBytes } from "crypto";

// Generate Alpaca-style key pair: "PK" + 20 char key id, 40 char secret.
export function generateKeyPair() {
  const keyId = "PK" + randomBytes(10).toString("hex").toUpperCase();
  const secret = randomBytes(20).toString("hex");
  return { keyId, secret };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifySecret(secret: string, hash: string): boolean {
  return hashSecret(secret) === hash;
}
