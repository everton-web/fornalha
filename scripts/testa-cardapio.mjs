#!/usr/bin/env node
/**
 * Confere as regras de preço do cardápio direto no banco.
 *
 *   npm run testa-cardapio
 *
 * Como em testa-pagamentos, roda dentro de uma transação sempre desfeita —
 * pode ser apontado para qualquer banco sem deixar sabor de teste para trás.
 *
 * O que se verifica aqui é a conta que o cliente paga. Um erro de arredondamento
 * ou uma faixa que não se aplica não derruba o sistema: cobra errado, em
 * silêncio, até alguém conferir o caixa no fim do mês.
 */

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
  console.log(`  ${condicao ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!condicao) falhas++;
}

/*
 * A função de verdade, importada de src/lib/pricing.ts — não uma cópia.
 *
 * Aqui existia uma reimplementação da conta, com o comentário "mesma conta de
 * src/lib/pricing.ts". Ela conferia a si mesma: trocando o corpo do
 * `pizzaBasePrice` de verdade por `Math.max(...)`, de modo que toda pizza
 * multi-sabor passasse a cobrar o sabor mais caro no lugar da média, esta
 * bateria inteira continuava imprimindo "Tudo passou". Um teste de preço que
 * não vê o preço mudar não é teste, é decoração.
 *
 * O import roda com --experimental-strip-types (ver o script no package.json):
 * o arquivo só traz `import type`, que o Node apaga junto com as anotações,
 * então não é preciso compilar nada para chamar a mesma função que atende o
 * cliente.
 */
const { pizzaBasePrice } = await import("../src/lib/pricing.ts");

class Desfaz extends Error {}

try {
  await sql.begin(async (tx) => {
    const [loja] = await tx`
      insert into tenants (slug, name, primary_color, half_pricing)
      values ('zz-teste-cardapio', 'Teste', '#7A2E1E', 'avg') returning id`;

    // Um tamanho que aceita 3 sabores — o caso que motivou tudo isto.
    const [grande] = await tx`
      insert into sizes (tenant_id, name, slices, max_flavors)
      values (${loja.id}, 'Grande', 8, 3) returning id`;
    const [broto] = await tx`
      insert into sizes (tenant_id, name, slices, max_flavors)
      values (${loja.id}, 'Broto', 4, 1) returning id`;

    console.log("\nFaixas de preço");
    const [tradicional] = await tx`
      insert into price_groups (tenant_id, name, sort_order)
      values (${loja.id}, 'Tradicionais', 0) returning id`;
    const [especial] = await tx`
      insert into price_groups (tenant_id, name, sort_order)
      values (${loja.id}, 'Especiais', 1) returning id`;

    await tx`
      insert into price_group_prices (group_id, size_id, price) values
        (${tradicional.id}, ${grande.id}, 45.00),
        (${tradicional.id}, ${broto.id},  28.00),
        (${especial.id},    ${grande.id}, 60.00),
        (${especial.id},    ${broto.id},  38.00)`;

    // Três sabores: dois herdam a faixa, um tem exceção só no Grande.
    const [mussarela] = await tx`
      insert into flavors (tenant_id, name, price_group_id)
      values (${loja.id}, 'Mussarela', ${tradicional.id}) returning id`;
    const [calabresa] = await tx`
      insert into flavors (tenant_id, name, price_group_id)
      values (${loja.id}, 'Calabresa', ${tradicional.id}) returning id`;
    const [camarao] = await tx`
      insert into flavors (tenant_id, name, price_group_id)
      values (${loja.id}, 'Camarão', ${especial.id}) returning id`;
    // Sem faixa nenhuma: o cardápio de antes desta migration continua assim.
    const [antiga] = await tx`
      insert into flavors (tenant_id, name)
      values (${loja.id}, 'Sabor Antigo') returning id`;

    await tx`
      insert into flavor_prices (flavor_id, size_id, price) values
        (${camarao.id}, ${grande.id}, 75.00),
        (${antiga.id},  ${grande.id}, 50.00),
        (${antiga.id},  ${broto.id},  30.00)`;

    // Mesma consulta e mesma fusão de src/lib/menu.ts.
    async function precosDoCardapio() {
      const [sabores, proprios, daFaixa] = await Promise.all([
        tx`select id, price_group_id from flavors where tenant_id = ${loja.id}`,
        tx`select fp.flavor_id, fp.size_id, fp.price from flavor_prices fp
           join flavors f on f.id = fp.flavor_id where f.tenant_id = ${loja.id}`,
        tx`select gp.group_id, gp.size_id, gp.price from price_group_prices gp
           join price_groups g on g.id = gp.group_id
           where g.tenant_id = ${loja.id} and g.is_active`,
      ]);

      const mapa = (linhas, chave) => {
        const m = new Map();
        for (const l of linhas) {
          const e = m.get(l[chave]) ?? {};
          e[l.size_id] = Number(l.price);
          m.set(l[chave], e);
        }
        return m;
      };
      const porSabor = mapa(proprios, "flavor_id");
      const porFaixa = mapa(daFaixa, "group_id");

      const out = {};
      for (const s of sabores) {
        out[s.id] = {
          ...(s.price_group_id ? (porFaixa.get(s.price_group_id) ?? {}) : {}),
          ...(porSabor.get(s.id) ?? {}),
        };
      }
      return out;
    }

    let precos = await precosDoCardapio();

    checa(
      "sabor da faixa herda o preço dela",
      precos[mussarela.id][grande.id] === 45 &&
        precos[mussarela.id][broto.id] === 28,
    );
    checa(
      "preço próprio vence a faixa, no tamanho em que existe",
      precos[camarao.id][grande.id] === 75,
      "Grande 75 em vez dos 60 da faixa",
    );
    checa(
      "e nos outros tamanhos a faixa continua valendo",
      precos[camarao.id][broto.id] === 38,
    );
    checa(
      "sabor sem faixa mantém o preço próprio",
      precos[antiga.id][grande.id] === 50 && precos[antiga.id][broto.id] === 30,
    );

    console.log("\nPizza de 3 sabores pela média");
    const tres = [
      precos[mussarela.id][grande.id],
      precos[calabresa.id][grande.id],
      precos[camarao.id][grande.id],
    ];
    checa(
      "média de 45 + 45 + 75 = 55",
      pizzaBasePrice(tres, "avg") === 55,
      `deu ${pizzaBasePrice(tres, "avg")}`,
    );
    checa(
      "a mesma pizza pela regra do mais caro custaria 75",
      pizzaBasePrice(tres, "max") === 75,
    );

    // Arredondamento: 45 + 45 + 60 dá 50 exato, mas 45+50+60 = 51,666…
    checa(
      "média com dízima arredonda a dois centavos",
      pizzaBasePrice([45, 50, 60], "avg") === 51.67,
      `deu ${pizzaBasePrice([45, 50, 60], "avg")}`,
    );

    checa(
      "o Broto só aceita 1 sabor, e isso continua valendo",
      (await tx`select max_flavors from sizes where id = ${broto.id}`)[0]
        .max_flavors === 1,
    );

    console.log("\nMexer na faixa move todos de uma vez");
    await tx`
      update price_group_prices set price = 49.00
      where group_id = ${tradicional.id} and size_id = ${grande.id}`;
    precos = await precosDoCardapio();
    checa(
      "os dois tradicionais subiram juntos",
      precos[mussarela.id][grande.id] === 49 &&
        precos[calabresa.id][grande.id] === 49,
    );
    checa(
      "a exceção do camarão não se mexeu",
      precos[camarao.id][grande.id] === 75,
    );

    console.log("\nQuando a faixa some");
    // on delete set null: o sabor não pode sumir do cardápio junto com a faixa.
    await tx`delete from price_groups where id = ${tradicional.id}`;
    const sobreviventes = await tx`
      select id, price_group_id from flavors
      where id in (${mussarela.id}, ${calabresa.id})`;
    checa(
      "os sabores continuam existindo",
      sobreviventes.length === 2,
      `sobraram ${sobreviventes.length}`,
    );
    checa(
      "e ficam sem faixa, não apagados",
      sobreviventes.every((s) => s.price_group_id === null),
    );

    console.log("\nFotos");
    await tx`
      update flavors set image_data = 'data:image/webp;base64,AAAA',
                         image_type = 'image/webp'
      where id = ${mussarela.id}`;
    const [comFoto] = await tx`
      select (image_data is not null) as has_image from flavors
      where id = ${mussarela.id}`;
    checa("has_image acusa a foto sem carregar os bytes", comFoto.has_image);

    const [semFoto] = await tx`
      select (image_data is not null) as has_image from flavors
      where id = ${calabresa.id}`;
    checa("sabor sem foto continua sem", semFoto.has_image === false);

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
