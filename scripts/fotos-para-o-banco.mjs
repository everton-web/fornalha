/**
 * Põe as fotos de db/fotos/ nos sabores e produtos da pizzaria de demonstração.
 *
 * Chamado pelo scripts/migrate.mjs, logo depois do demo.sql — e portanto em
 * todo deploy. Fica em módulo à parte porque não é migration: migration muda
 * o formato do banco, isto enche uma vitrine.
 *
 * POR QUE NÃO É UM .SQL — as fotos são arquivos binários. Para caberem em SQL
 * teriam que virar base64 embutido, uns 1,3 MB de texto ilegível que o git
 * versiona linha a linha e que ninguém consegue revisar. Como arquivo .webp, o
 * git guarda o binário, e trocar uma foto é trocar um arquivo.
 *
 * POR QUE GRAVA SEMPRE, e não só quando está vazio — trocar a foto de um sabor
 * tem que ser trocar o arquivo e subir. Com `where image_data is null` a
 * primeira foto ficaria para sempre, e a segunda exigiria SQL na mão, que é
 * exatamente o problema que o deploy-que-migra-sozinho veio resolver. Escrever
 * por cima é seguro aqui porque o alvo é só a demonstração, onde ninguém envia
 * foto: a conta é somente leitura (`requireEscrita`).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PASTA = "db/fotos";

/**
 * Arquivo → item do cardápio. O nome tem que bater com o do db/seed.sql.
 *
 * Escrito à mão, e não deduzido do nome do arquivo, porque "Frango c/
 * Catupiry" não vira "frango-catupiry" por nenhuma regra que valha a pena
 * manter — e um casamento errado põe foto de sobremesa em pizza salgada sem
 * ninguém perceber.
 */
const SABORES = {
  margherita: "Margherita",
  calabresa: "Calabresa",
  portuguesa: "Portuguesa",
  napolitana: "Napolitana",
  vegetariana: "Vegetariana",
  "quatro-queijos": "Quatro Queijos",
  "frango-catupiry": "Frango c/ Catupiry",
  pepperoni: "Pepperoni",
  "bacon-supreme": "Bacon Supreme",
  "marguerita-trufada": "Marguerita Trufada",
  "chocolate-morango": "Chocolate c/ Morango",
  "banana-canela": "Banana c/ Canela",
  prestigio: "Prestígio",
};

const PRODUTOS = {
  "coca-cola": "Coca-Cola 2L",
  guarana: "Guaraná Antarctica 2L",
  agua: "Água mineral 500ml",
  "suco-laranja": "Suco de laranja 1L",
  cerveja: "Cerveja Heineken 600ml",
  "petit-gateau": "Petit Gateau",
  tiramisu: "Tiramisù",
};

/** O mesmo formato que o painel grava: data URI no texto, tipo à parte. */
function dataUri(slug) {
  const caminho = join(PASTA, `${slug}.webp`);
  if (!existsSync(caminho)) return null;
  return `data:image/webp;base64,${readFileSync(caminho).toString("base64")}`;
}

export async function fotosParaOBanco(sql) {
  const [tenant] = await sql`select id from tenants where slug = 'bella-napoli'`;
  // Banco só com clientes de verdade: não há demonstração para ilustrar.
  if (!tenant) return { gravadas: 0, ausentes: 0 };

  let gravadas = 0;
  let ausentes = 0;

  for (const [tabela, mapa] of [
    ["flavors", SABORES],
    ["products", PRODUTOS],
  ]) {
    for (const [slug, nome] of Object.entries(mapa)) {
      const uri = dataUri(slug);
      if (!uri) {
        ausentes++;
        continue;
      }

      const linhas = await sql`
        update ${sql(tabela)}
        set image_data = ${uri}, image_type = 'image/webp'
        where tenant_id = ${tenant.id} and name = ${nome}
        returning id
      `;

      // Nome que não bate é erro de digitação no mapa acima, e some calado se
      // ninguém contar: o sabor fica sem foto e o cardápio parece incompleto.
      if (linhas.length === 0) {
        console.warn(`  ⚠ ${tabela}: nenhum item chamado "${nome}"`);
      }
      gravadas += linhas.length;
    }
  }

  return { gravadas, ausentes };
}
