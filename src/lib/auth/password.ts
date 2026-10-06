import { randomBytes } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";

// Argon2id with OWASP-recommended minimums (19 MiB, t=2, p=1). hash-wasm is a
// WASM build, so there is no native binary to break on locked-down Windows
// machines or serverless platforms.
export function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    memorySize: 19456,
    iterations: 2,
    parallelism: 1,
    hashLength: 32,
    outputType: "encoded",
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: passwordHash });
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/** Burns equivalent CPU time when the user does not exist, to avoid a timing oracle. */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword("timing-equalizer-not-a-real-password");
  await verifyPassword(await dummyHash, password);
}
