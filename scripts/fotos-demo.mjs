#!/usr/bin/env node
/**
 * Baixa as fotos da pizzaria de demonstração no Wikimedia Commons.
 *
 * Roda à mão, não no deploy: o resultado é conferido no olho e vira arquivo
 * versionado em db/fotos/. Deploy que sai buscando imagem em serviço de
 * terceiro é deploy que quebra no dia em que o serviço cai — e ninguém vai
 * entender por que a demo ficou sem foto.
 *
 *   node scripts/fotos-demo.mjs --candidatos   # baixa as opções p/ escolher
 *   node scripts/fotos-demo.mjs                # grava a escolha de ESCOLHAS
 *
 * POR QUE COMMONS — não precisa de chave, e a licença é limpa: domínio
 * público, CC0 ou CC BY/BY-SA, todas permitindo obra derivada (este script
 * redimensiona, então derivada é obrigatório; ND fica de fora na peneira
 * abaixo). O acervo é irregular, e é por isso que existe o passo de escolher:
 * pegar o primeiro resultado põe hambúrguer em "Marguerita Trufada".
 *
 * As fotos saem em WebP de 600px, que é exatamente o que o navegador produz
 * quando uma pizzaria envia foto pelo painel (ver `foto-field.tsx`). A demo
 * tem que carregar o mesmo peso que um cliente de verdade, senão ela mede
 * outra coisa.
 */

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DESTINO = "db/fotos";
const CANDIDATOS = "db/fotos/.candidatos";
const CREDITOS = "db/fotos/creditos.json";

/**
 * As buscas de cada item — mais de uma por item de propósito.
 *
 * Prato brasileiro não existe no Commons com o nome daqui: "calabresa" volta
 * vazio, "sausage pizza" volta cheio. E busca boa em acervo de enciclopédia é
 * o nome canônico do prato, não a descrição do cardápio.
 */
const ITENS = {
  margherita: ["pizza margherita", "pizza napoletana basil"],
  calabresa: ["sausage pizza", "pizza salsiccia"],
  // "pizza portuguesa" no Commons cai em gráfico de pizza sobre a língua
  // portuguesa e na Estação de São Bento. O prato é o que importa: presunto,
  // ovo e azeitona.
  portuguesa: ["pizza boiled egg ham", "pizza prosciutto uovo olives"],
  napolitana: ["pizza napolitana", "pizza tomato mozzarella slices"],
  vegetariana: ["vegetarian pizza", "pizza vegetables"],
  "quatro-queijos": ["quattro formaggi", "four cheese pizza"],
  "frango-catupiry": ["pizza frango catupiry", "chicken pizza"],
  pepperoni: ["pepperoni pizza", "pizza pepperoni slice"],
  "bacon-supreme": ["bacon pizza", "pizza bacon cheese"],
  "marguerita-trufada": ["truffle pizza", "gourmet pizza mozzarella di bufala"],

  "chocolate-morango": ["chocolate strawberry dessert", "strawberry chocolate cake"],
  "banana-canela": ["banana dessert cinnamon", "caramelized banana dessert"],
  prestigio: ["chocolate coconut cake", "coconut chocolate dessert"],

  "coca-cola": ["coca-cola bottle", "cola glass bottle"],
  guarana: ["guaraná antarctica", "guarana soft drink"],
  // "mineral water bottle" traz a fábrica de engarrafamento, não a garrafa.
  agua: ["water bottle table", "glass of water bottle drink"],
  "suco-laranja": ["orange juice glass", "freshly squeezed orange juice"],
  cerveja: ["beer bottle green", "heineken bottle"],

  "petit-gateau": ["chocolate fondant cake", "lava cake ice cream"],
  tiramisu: ["tiramisu", "tiramisu slice plate"],
};

/**
 * A escolha, item por item: "<n>" é a posição na folha de contato.
 *
 * Preenchido à mão depois de olhar as folhas geradas por --candidatos. É o
 * passo que não dá para automatizar: só olhando dá para ver que a foto de
 * "chicken pizza" veio com um sundae.
 */
const ESCOLHAS = JSON.parse(
  existsSync("db/fotos/escolhas.json")
    ? readFileSync("db/fotos/escolhas.json", "utf8")
    : "{}",
);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Busca com recuo.
 *
 * O Commons corta rajada sem avisar direito: no meio de vinte itens ele
 * simplesmente para de responder, e o resultado é uma lista de "0 candidatos"
 * que parece busca ruim mas é ritmo. Três tentativas com espera crescente
 * resolvem, e falhar de vez é melhor que gravar meia lista em silêncio.
 */
async function pedir(url, tentativas = 4) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "fornalha-demo/1.0 (cardapio de demonstracao)" },
      });
      if (r.ok) return r;
    } catch {
      // rede oscilando conta como tentativa
    }
    if (i < tentativas) await espera(i * 3000);
  }
  return null;
}

/** Licença que proíbe derivada não serve: este script redimensiona. */
function permiteDerivada(licenca = "") {
  return !/\bND\b|NoDeriv/i.test(licenca);
}

/** Busca candidatos no Commons, já com URL de 800px e a licença. */
async function candidatos(buscas) {
  const achados = [];

  for (const busca of buscas) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `filetype:bitmap ${busca}`);
    url.searchParams.set("gsrlimit", "8");
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|extmetadata");
    url.searchParams.set("iiurlwidth", "800");

    const r = await pedir(url);
    if (!r) continue;
    const dados = await r.json();

    for (const p of Object.values(dados?.query?.pages ?? {})) {
      const info = p.imageinfo?.[0];
      if (!info?.thumburl) continue;
      const meta = info.extmetadata ?? {};
      const licenca = meta.LicenseShortName?.value ?? "desconhecida";
      if (!permiteDerivada(licenca)) continue;

      achados.push({
        url: info.thumburl,
        titulo: p.title.replace(/^File:/, ""),
        autor: (meta.Artist?.value ?? "desconhecido")
          .replace(/<[^>]*>/g, "")
          .trim()
          .slice(0, 60),
        pagina: info.descriptionurl,
        licenca,
        busca,
      });
    }
    await espera(900);
  }

  // Mesmo arquivo aparece nas duas buscas; a ordem da primeira manda.
  const vistos = new Set();
  return achados.filter((a) => !vistos.has(a.titulo) && vistos.add(a.titulo));
}

async function baixar(url, saida, { quadrado = true } = {}) {
  const r = await pedir(url);
  if (!r) throw new Error("imagem não veio depois de 4 tentativas");
  const bytes = Buffer.from(await r.arrayBuffer());

  // 600px e qualidade 80: o mesmo que o painel aplica no envio.
  await sharp(bytes)
    .resize(600, 600, { fit: quadrado ? "cover" : "inside", position: "centre" })
    .webp({ quality: 80 })
    .toFile(saida);
}

// ---------------------------------------------------------------- execução

const argv = process.argv.slice(2);
const alvos = argv.filter((a) => !a.startsWith("--"));
const lista = alvos.length ? alvos : Object.keys(ITENS);
const modoCandidatos = argv.includes("--candidatos");

mkdirSync(DESTINO, { recursive: true });

if (modoCandidatos) {
  mkdirSync(CANDIDATOS, { recursive: true });

  /*
   * Parte do índice que já existe, e não de um objeto vazio.
   *
   * Rebuscar um item só é o caso comum — a linha inteira veio ruim e as
   * outras dezenove estavam boas. Começando do zero, a gravação no fim
   * apagava as dezenove: as imagens continuavam no disco, mas sem a
   * procedência, que é o que diz de quem é a foto e sob qual licença.
   */
  const arquivoIndice = join(CANDIDATOS, "indice.json");
  const indice = existsSync(arquivoIndice)
    ? JSON.parse(readFileSync(arquivoIndice, "utf8"))
    : {};

  for (const slug of lista) {
    const buscas = ITENS[slug];
    if (!buscas) {
      console.error(`✖ ${slug}: não está na lista`);
      process.exitCode = 1;
      continue;
    }

    const opcoes = (await candidatos(buscas)).slice(0, 8);
    indice[slug] = [];

    for (const [i, op] of opcoes.entries()) {
      try {
        await baixar(op.url, join(CANDIDATOS, `${slug}-${i + 1}.webp`));
        indice[slug].push(op);
      } catch {
        // candidato que não baixa simplesmente não entra na folha
      }
    }
    console.log(`• ${slug}: ${indice[slug].length} candidatos`);
    await espera(300);
  }

  writeFileSync(arquivoIndice, `${JSON.stringify(indice, null, 2)}\n`);
  console.log(`\nCandidatos em ${CANDIDATOS}. Monte a folha e preencha escolhas.json.`);
} else {
  const creditos = existsSync(CREDITOS)
    ? JSON.parse(readFileSync(CREDITOS, "utf8"))
    : {};
  const indice = JSON.parse(
    readFileSync(join(CANDIDATOS, "indice.json"), "utf8"),
  );

  for (const slug of lista) {
    const n = ESCOLHAS[slug];
    if (!n) {
      console.error(`✖ ${slug}: sem escolha em escolhas.json`);
      process.exitCode = 1;
      continue;
    }

    const op = indice[slug]?.[n - 1];
    if (!op) {
      console.error(`✖ ${slug}: candidato ${n} não existe`);
      process.exitCode = 1;
      continue;
    }

    /*
     * Um item que falha não derruba os outros dezenove.
     *
     * O Commons recusa por ritmo, não por a foto não existir: uma exceção
     * solta aqui abortava o laço no terceiro item e perdia as escolhas já
     * feitas. Registrar e seguir deixa o rodar de novo pegar só o que faltou.
     */
    try {
      /*
       * O candidato já foi baixado, com o mesmo tamanho e a mesma qualidade,
       * na hora de montar a folha de contato. Se o Commons estiver cortando
       * por ritmo (429), copiar o arquivo local dá exatamente o mesmo
       * resultado que baixar de novo — e evita a situação boba de ter a
       * imagem certa em disco e mesmo assim falhar.
       */
      const jaBaixado = join(CANDIDATOS, `${slug}-${n}.webp`);
      if (existsSync(jaBaixado)) {
        copyFileSync(jaBaixado, join(DESTINO, `${slug}.webp`));
      } else {
        await baixar(op.url, join(DESTINO, `${slug}.webp`));
      }
      creditos[slug] = {
        titulo: op.titulo,
        autor: op.autor,
        pagina: op.pagina,
        licenca: op.licenca,
        fonte: "Wikimedia Commons",
      };
      console.log(`✓ ${slug} — ${op.titulo} (${op.licenca})`);
    } catch (erro) {
      console.error(`✖ ${slug}: ${erro.message}`);
      process.exitCode = 1;
    }
    await espera(900);
  }

  writeFileSync(CREDITOS, `${JSON.stringify(creditos, null, 2)}\n`);
  console.log(`\n${lista.length} item(ns). Créditos em ${CREDITOS}.`);
}
