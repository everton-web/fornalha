#!/usr/bin/env node
/**
 * Troca a senha de acesso ao painel.
 *
 * Sem --senha, gera uma senha forte e grava em CREDENCIAIS.local.txt — que fica
 * fora do controle de versão. A senha não é impressa no terminal, para não
 * ficar no histórico do shell nem em log de sessão.
 *
 *   npm run trocar-senha -- --email=voce@exemplo.com
 *   npm run trocar-senha -- --email=voce@exemplo.com --senha=umaQueEuEscolhi
 */

import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";

import { args, connect, die, hashPassword } from "./lib.mjs";

const ARQUIVO = "CREDENCIAIS.local.txt";

/** Sem caracteres ambíguos e sem símbolos que quebram URL de conexão. */
function gerarSenha() {
  const alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(20);
  return [...bytes].map((b) => alfabeto[b % alfabeto.length]).join("");
}

const { email, senha } = args();
if (!email) {
  die(
    "Falta o e-mail. Exemplo:\n  npm run trocar-senha -- --email=voce@exemplo.com",
  );
}

const nova = senha || gerarSenha();
if (nova.length < 12) die("Use pelo menos 12 caracteres.");

const sql = connect();

try {
  const emailNormalizado = email.trim().toLowerCase();
  const [usuario] = await sql`
    update users set password_hash = ${await hashPassword(nova)}
    where email = ${emailNormalizado}
    returning id
  `;

  if (!usuario) die(`Não achei nenhum usuário com o e-mail ${emailNormalizado}.`);

  // Derruba as sessões abertas: senha trocada tem que expulsar quem estava dentro.
  const derrubadas = await sql`
    delete from sessions where user_id = ${usuario.id} returning token_hash
  `;

  const carimbo = new Date().toISOString().slice(0, 16).replace("T", " ");
  appendFileSync(
    ARQUIVO,
    `\n[${carimbo}] painel Fornalha\n  e-mail: ${emailNormalizado}\n  senha:  ${nova}\n`,
    "utf8",
  );

  console.log(`
✓ Senha trocada para ${emailNormalizado}.
  ${derrubadas.length} sessão(ões) aberta(s) encerrada(s).

  A senha foi gravada em ${ARQUIVO} (fora do Git).
  Abra o arquivo, guarde a senha no seu gerenciador e apague o arquivo depois.
`);
} catch (erro) {
  die(erro.message);
} finally {
  await sql.end();
}
