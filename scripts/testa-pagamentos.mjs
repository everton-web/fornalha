#!/usr/bin/env node
/**
 * Confere as regras do pagamento online direto no banco.
 *
 *   npm run testa-pagamentos
 *
 * Roda tudo dentro de uma transação que **sempre** é desfeita no fim, então
 * pode ser apontado para qualquer banco — inclusive o de produção — sem deixar
 * pizzaria, pedido ou cobrança de teste para trás.
 *
 * O que está aqui não é enfeite: são as invariantes que, se quebrarem, quebram
 * calado. Um pedido marcado como pago sendo de outra pizzaria, um webhook
 * processado duas vezes, uma credencial que volta corrompida do banco — nada
 * disso aparece numa tela de erro, só num prejuízo depois.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import postgres from "postgres";

import { die, loadEnv } from "./lib.mjs";

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) die("DATABASE_URL não definida. Preencha o .env.local.");

const local = url.includes("localhost") || url.includes("127.0.0.1");
const sql = postgres(url, {
  ssl: local ? false : "require",
  prepare: false,
  max: 1,
  transform: { undefined: null },
});

let falhas = 0;
function checa(nome, condicao, extra = "") {
  console.log(
    `  ${condicao ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`,
  );
  if (!condicao) falhas++;
}

/** Mesma cifra de src/lib/crypto.ts: iv ‖ tag ‖ texto cifrado. */
const chave = randomBytes(32);
function cifra(valor) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave, iv);
  const ct = Buffer.concat([
    c.update(Buffer.from(JSON.stringify(valor))),
    c.final(),
  ]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}
function decifra(blob) {
  const b = Buffer.from(blob);
  const d = createDecipheriv("aes-256-gcm", chave, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([d.update(b.subarray(28)), d.final()]).toString(),
  );
}

const ATIVOS = ["pending", "confirmed", "preparing", "ready", "out_for_delivery"];

class Desfaz extends Error {}

try {
  await sql.begin(async (tx) => {
    // Duas pizzarias com o mesmo código de pedido: `orders.code` é único por
    // tenant, então essa colisão é possível na vida real.
    const [loja] = await tx`
      insert into tenants (slug, name, primary_color)
      values ('zz-teste-pag-a', 'Teste A', '#7A2E1E') returning id`;
    const [outra] = await tx`
      insert into tenants (slug, name, primary_color)
      values ('zz-teste-pag-b', 'Teste B', '#7A2E1E') returning id`;

    const [pedidoA] = await tx`
      insert into orders (tenant_id, code, customer_name, customer_phone,
                          payment_method, subtotal, total)
      values (${loja.id}, 'GQV3', 'Cliente A', '11999999999',
              'pix_online', 90, 90) returning id`;
    const [pedidoB] = await tx`
      insert into orders (tenant_id, code, customer_name, customer_phone,
                          payment_method, subtotal, total)
      values (${outra.id}, 'GQV3', 'Cliente B', '11888888888',
              'pix_online', 50, 50) returning id`;

    console.log("\nCredenciais");
    const segredo = { access_token: "APP_USR-000111222", webhook_secret: "s3" };
    await tx`
      insert into tenant_payment_accounts
        (tenant_id, provider, credentials, accepts_pix, accepts_card, hint)
      values (${loja.id}, 'mercadopago', ${cifra(segredo)}, true, true, '1222')`;

    const [conta] = await tx`
      select credentials from tenant_payment_accounts where tenant_id = ${loja.id}`;
    checa(
      "credencial volta do bytea íntegra",
      decifra(conta.credentials).access_token === segredo.access_token,
    );

    const adulterado = Buffer.from(conta.credentials);
    adulterado[adulterado.length - 1] ^= 0xff;
    let recusou = false;
    try {
      decifra(adulterado);
    } catch {
      recusou = true;
    }
    checa("bloco adulterado no banco é recusado pela tag GCM", recusou);

    console.log("\nEscolha do gateway");
    for (const kind of ["pix", "card"]) {
      const querPix = kind === "pix";
      const achou = await tx`
        select provider from tenant_payment_accounts
        where tenant_id = ${loja.id} and is_active
          and (case when ${querPix} then accepts_pix else accepts_card end)
        order by sort_order, provider limit 1`;
      checa(`acha gateway para ${kind}`, achou.length === 1);
    }

    await tx`update tenant_payment_accounts set accepts_card = false
             where tenant_id = ${loja.id}`;
    const semCartao = await tx`
      select provider from tenant_payment_accounts
      where tenant_id = ${loja.id} and is_active
        and (case when ${false} then accepts_pix else accepts_card end) limit 1`;
    checa("cartão desligado some da escolha", semCartao.length === 0);

    console.log("\nCobranças");
    const [pagA] = await tx`
      insert into payments (order_id, tenant_id, provider, method, amount,
                            provider_charge_id)
      values (${pedidoA.id}, ${loja.id}, 'mercadopago', 'pix_online', 90, 'zz-teste-cobranca-1')
      returning id`;
    const [pagB] = await tx`
      insert into payments (order_id, tenant_id, provider, method, amount,
                            provider_charge_id)
      values (${pedidoB.id}, ${outra.id}, 'mercadopago', 'pix_online', 50, 'zz-teste-cobranca-2')
      returning id`;

    // Savepoint: erro solto dentro de uma transação aborta a transação
    // inteira, e aqui a violação é o resultado esperado do teste.
    let duplicou = false;
    try {
      await tx.savepoint(
        (sp) =>
          sp`update payments set provider_charge_id = 'zz-teste-cobranca-1' where id = ${pagB.id}`,
      );
    } catch (error) {
      duplicou = error.code === "23505";
    }
    checa("mesmo id de cobrança não vira duas linhas", duplicou);

    // A busca sem tenant é ambígua — é o motivo de `settleCharge` exigir o
    // tenant junto do código do pedido.
    const semTenant = await tx`
      select p.id from payments p join orders o on o.id = p.order_id
      where p.provider = 'mercadopago' and o.code = 'GQV3'`;
    checa(
      "busca só pelo código do pedido é ambígua entre pizzarias",
      semTenant.length === 2,
      `${semTenant.length} pedidos`,
    );

    const comTenant = await tx`
      select p.id, p.amount from payments p join orders o on o.id = p.order_id
      where p.provider = 'mercadopago' and p.tenant_id = ${loja.id}
        and o.code = 'GQV3'`;
    checa(
      "com o tenant junto, acha só o pedido certo",
      comTenant.length === 1 && Number(comTenant[0].amount) === 90,
    );

    await tx`update payments set status = 'paid', paid_at = now() where id = ${pagA.id}`;
    await tx`update payments set status = 'refunded',
             paid_at = coalesce(${null}, paid_at) where id = ${pagA.id}`;
    const [estornado] = await tx`select status, paid_at from payments where id = ${pagA.id}`;
    checa(
      "estorno preserva a data em que foi pago",
      estornado.status === "refunded" && estornado.paid_at !== null,
    );

    console.log("\nWebhook");
    await tx`insert into payment_webhook_events (provider, external_id)
             values ('mercadopago', 'zz-evt-1')`;
    let repetido = false;
    try {
      await tx.savepoint(
        (sp) =>
          sp`insert into payment_webhook_events (provider, external_id)
             values ('mercadopago', 'zz-evt-1')`,
      );
    } catch (error) {
      repetido = error.code === "23505";
    }
    checa("evento repetido é barrado pela chave única", repetido);

    console.log("\nFila da cozinha");
    const contar = async () => {
      const [r] = await tx`
        select count(*)::int as ativos from orders
        where tenant_id = ${loja.id} and status::text = any(${ATIVOS})
          and not (payment_method in ('pix_online','card_online')
                   and payment_status = 'pending')`;
      return r.ativos;
    };

    checa("pedido online não pago fica fora da fila", (await contar()) === 0);

    await tx`update orders set payment_status = 'paid' where id = ${pedidoA.id}`;
    checa("depois de pago ele entra na fila", (await contar()) === 1);

    await tx`
      insert into orders (tenant_id, code, customer_name, customer_phone,
                          payment_method, subtotal, total)
      values (${loja.id}, 'ZZA1', 'Cliente C', '11977777777', 'cash', 40, 40)`;
    checa("pedido em dinheiro entra na fila na hora", (await contar()) === 2);

    console.log("\nLimpeza");
    await tx`delete from tenants where id = ${loja.id}`;
    const [{ sobrou }] = await tx`
      select count(*)::int as sobrou from payments where tenant_id = ${loja.id}`;
    checa("apagar a pizzaria leva as cobranças junto", sobrou === 0);

    // Sai por erro de propósito: é o que garante o rollback de tudo que passou
    // por aqui, inclusive num banco de produção.
    throw new Desfaz();
  });
} catch (error) {
  if (!(error instanceof Desfaz)) {
    console.error(`\n✖ ${error.message}\n`);
    await sql.end();
    process.exit(1);
  }
}

await sql.end();

if (falhas === 0) {
  console.log("\n✓ Tudo passou. Nada ficou gravado no banco.\n");
} else {
  console.error(`\n✖ ${falhas} verificação(ões) falharam.\n`);
  process.exitCode = 1;
}
