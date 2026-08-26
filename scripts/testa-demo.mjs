/**
 * A conta de demonstração vê tudo e não muda nada.
 *
 * Isso vale por uma linha em `requireEscrita()` — e por ninguém esquecer de
 * chamá-la. Esquecer uma única ação basta para um visitante apagar o cardápio
 * que você usa para vender, e o esquecimento não aparece em lugar nenhum: a
 * tela funciona, o teste passa, e o estrago só se descobre depois.
 *
 * Então aqui a regra é conferida em vez de combinada: toda Server Action
 * exportada precisa passar por `requireEscrita`, por `requirePlatformAdmin`,
 * ou estar na lista abaixo com o motivo escrito.
 *
 *     npm run testa-demo
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Ações que existem para ser públicas, e por quê.
 *
 * Nenhuma delas escreve no cardápio ou nos pedidos de uma pizzaria: são a
 * porta de entrada do sistema. Se uma ação nova precisar entrar aqui, o
 * motivo tem que caber nesta frase.
 */
const PUBLICAS = {
  signIn: "é o próprio login — exigir sessão para entrar seria circular",
  signOut: "sair não precisa de permissão para escrever",
  requestPasswordReset: "quem esqueceu a senha não tem como se autenticar",
  resetPassword: "a prova é o token do e-mail, não a sessão",
  instalarSistema: "roda com o banco ainda sem contas; trava no próprio estado",
  entrarNaDemo: "cria a sessão de demonstração; não escreve nada da pizzaria",
  lookupAddress: "é o cliente consultando o próprio CEP no cardápio público",
  createOrder: "é o cliente fazendo o pedido; o cardápio é público por natureza",
};

function arquivosDeAcao(dir, achados = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      arquivosDeAcao(caminho, achados);
    } else if (/\.tsx?$/.test(nome)) {
      const src = readFileSync(caminho, "utf8");
      if (/^\s*["']use server["']/m.test(src)) achados.push([caminho, src]);
    }
  }
  return achados;
}

/**
 * O corpo de uma função, a partir do fim do nome.
 *
 * Achar "a primeira `{`" não serve: ela costuma ser de um tipo, não do corpo —
 * em `setOrderStatus(input: { ... })` está no parâmetro, e em
 * `): Promise<ActionResult<{ slug: string }>>` está no tipo de retorno. Pegar
 * a errada faz o teste acusar ação protegida de desprotegida.
 *
 * Então: fecha a lista de parâmetros contando parênteses, e depois procura a
 * `{` que esteja fora de qualquer `<...>` — essa é a do corpo.
 */
function corpo(src, aposNome) {
  let paren = 1;
  let i = aposNome;
  for (; i < src.length && paren > 0; i++) {
    if (src[i] === "(") paren++;
    else if (src[i] === ")") paren--;
  }

  let angulo = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "<") angulo++;
    // "=>" dentro de um tipo não fecha generic nenhum.
    else if (c === ">" && src[i - 1] !== "=") angulo--;
    else if (c === "{" && angulo === 0) break;
  }
  if (i >= src.length) return "";

  const inicio = i;
  let nivel = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") nivel++;
    else if (src[i] === "}" && --nivel === 0) return src.slice(inicio, i + 1);
  }
  return src.slice(inicio);
}

const falhas = [];
let conferidas = 0;

for (const [caminho, src] of arquivosDeAcao("src/app")) {
  const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const nome = m[1];
    conferidas++;

    if (nome in PUBLICAS) continue;

    const body = corpo(src, re.lastIndex);
    const protegida =
      /\brequireEscrita\s*\(/.test(body) ||
      /\brequirePlatformAdmin\s*\(/.test(body);

    if (!protegida) {
      const soLeitura = /\brequireSession\s*\(/.test(body)
        ? " — usa requireSession, que a conta de demonstração passa"
        : " — não confere sessão nenhuma";
      falhas.push(`${caminho} → ${nome}()${soLeitura}`);
    }
  }
}

if (falhas.length) {
  console.error(`\n✖ ${falhas.length} Server Action sem trava de escrita:\n`);
  for (const f of falhas) console.error(`  ${f}`);
  console.error(
    "\nUse requireEscrita() no lugar de requireSession(), ou declare a ação\n" +
      "em PUBLICAS (scripts/testa-demo.mjs) com o motivo.\n",
  );
  process.exit(1);
}

console.log(
  `\n✓ ${conferidas} Server Actions conferidas — ` +
    `${Object.keys(PUBLICAS).length} públicas por motivo declarado, ` +
    `${conferidas - Object.keys(PUBLICAS).length} atrás da trava de escrita.\n`,
);
