import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra de dados sensíveis guardados no banco.
 *
 * Serve às credenciais de gateway de pagamento: ali mora o token que movimenta
 * o dinheiro de outra empresa. Senha de painel usa scrypt (hash, mão única);
 * aqui o valor precisa voltar ao original para chamar a API do gateway, então
 * é cifra de mão dupla — e a chave fica no ambiente, não no banco. Quem tirar
 * um dump do Postgres leva bytes embaralhados.
 *
 * Formato do bloco: iv (12 bytes) ‖ tag (16 bytes) ‖ texto cifrado.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // padrão recomendado para GCM
const TAG_LENGTH = 16;

function readKey(): Buffer {
  const raw = process.env.PAYMENTS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PAYMENTS_ENCRYPTION_KEY não configurada. Gere uma com:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `PAYMENTS_ENCRYPTION_KEY deve ter 32 bytes em base64 (tem ${key.length}).`,
    );
  }
  return key;
}

export function encryptJson(value: unknown): Buffer {
  const key = readKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptJson<T>(blob: Buffer | Uint8Array): T {
  const key = readKey();
  const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);

  if (buffer.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error("Bloco cifrado inválido ou truncado.");
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  // A tag é o que garante que ninguém editou o bloco no banco: sem ela, um
  // texto cifrado adulterado seria decifrado como lixo silencioso.
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/** Diz se a chave está configurada, sem estourar erro em tela de listagem. */
export function encryptionAvailable(): boolean {
  try {
    readKey();
    return true;
  } catch {
    return false;
  }
}
