#!/usr/bin/env node
/**
 * Baixa as fotos da pizzaria de demonstração.
 *
 * Roda à mão, não no deploy: o resultado é conferido no olho e vira arquivo
 * versionado em db/fotos/. Deploy que sai buscando imagem em serviço de
 * terceiro é deploy que quebra no dia em que o serviço cai — e ninguém vai
 * entender por que a demo ficou sem foto.
 *
 *   node scripts/fotos-demo.mjs                     # todos, pelo Openverse
 *   node scripts/fotos-demo.mjs --fonte=pexels      # todos, pelo Pexels
 *   node scripts/fotos-demo.mjs margherita --n=3    # 3ª opção de um item só
 *
 * DUAS FONTES, porque elas trocam qualidade por burocracia:
 *
 *   openverse — sem chave, licença Creative Commons de uso comercial. Acervo
 *               do Flickr e afins: irregular, mas dá para rodar agora.
 *   pexels    — precisa de PEXELS_API_KEY (grátis em pexels.com/api). Foto de
 *               comida profissional, licença livre sem atribuição exigida.
 *
 * As fotos saem em WebP de 600px, que é exatamente o que o navegador produz
 * quando uma pizzaria envia foto pelo painel (ver `foto-field.tsx`). A demo
 * tem que carregar o mesmo peso que um cliente de verdade, senão ela mede
 * outra coisa.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DESTINO = "db/fotos";
const CREDITOS = "db/fotos/creditos.json";

/**
 * A busca de cada item. A chave casa com o `slug` de db/fotos-demo.sql.
 *
 * Alguns sabores são brasileiros e não existem no acervo com esse nome:
 * calabresa vira "sausage", catupiry vira "creamy chicken". A foto é
 * ilustrativa — o que não pode é vir pizza errada na cara de quem está
 * avaliando comprar.
 */
const ITENS = {
  // ------------------------------------------------------------- sabores
  margherita: "pizza margherita fresh basil",
  calabresa: "sausage pizza red onion",
  portuguesa: "pizza ham egg olives",
  napolitana: "pizza tomato slices parmesan",
  vegetariana: "vegetarian pizza vegetables",
  "quatro-queijos": "four cheese pizza",
  "frango-catupiry": "creamy chicken pizza",
  pepperoni: "pepperoni pizza close up",
  "bacon-supreme": "bacon cheddar pizza",
  "marguerita-trufada": "gourmet truffle pizza",

  // --------------------------------------------------------------- doces
  "chocolate-morango": "chocolate strawberry dessert",
  "banana-canela": "banana cinnamon dessert",
  prestigio: "chocolate coconut cake",

  // ------------------------------------------------------------ bebidas
  "coca-cola": "cola bottle glass",
  guarana: "soda bottle drink",
  agua: "mineral water bottle",
  "suco-laranja": "fresh orange juice glass",
  cerveja: "cold beer bottle",

  // --------------------------------------------------------- sobremesas
  "petit-gateau": "chocolate lava cake",
  tiramisu: "tiramisu dessert",
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * As duas fontes, normalizadas para o mesmo formato.
 *
 * Cada uma devolve { url, autor, pagina, licenca } para as `n` primeiras
 * opções, e o resto do script não precisa saber de onde veio.
 */
const FONTES = {
  async openverse(busca, n) {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", busca);
    url.searchParams.set("page_size", String(Math.max(n, 8)));
    /*
     * Uso comercial E direito de modificar — as duas coisas, não uma.
     *
     * "commercial" sozinho deixa passar CC BY-ND, que permite vender mas
     * proíbe obra derivada. Como este script redimensiona e converte para
     * WebP, toda foto que sai daqui é derivada: pedir só "commercial"
     * produzia arquivo que a licença não deixa usar do jeito que ele existe.
     */
    url.searchParams.set("license_type", "commercial,modification");
    url.searchParams.set("mature", "false");

    const r = await fetch(url);
    if (!r.ok) throw new Error(`Openverse respondeu ${r.status}`);
    const { results } = await r.json();
    return (results ?? []).map((f) => ({
      url: f.url,
      autor: f.creator ?? "desconhecido",
      pagina: f.foreign_landing_url,
      licenca: `CC ${(f.license ?? "").toUpperCase()} ${f.license_version ?? ""}`.trim(),
    }));
  },

  async pexels(busca, n) {
    const chave = process.env.PEXELS_API_KEY;
    if (!chave) {
      throw new Error(
        "PEXELS_API_KEY não definida. Pegue uma grátis em pexels.com/api " +
          "e ponha no .env.local, ou rode com --fonte=openverse.",
      );
    }

    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", busca);
    url.searchParams.set("per_page", String(Math.max(n, 8)));
    url.searchParams.set("orientation", "square");

    const r = await fetch(url, { headers: { Authorization: chave } });
    if (!r.ok) throw new Error(`Pexels respondeu ${r.status}`);
    const { photos } = await r.json();
    return (photos ?? []).map((f) => ({
      url: f.src.large,
      autor: f.photographer,
      pagina: f.url,
      licenca: "Pexels License",
    }));
  },
};

const argv = process.argv.slice(2);
const alvos = argv.filter((a) => !a.startsWith("--"));
const opcao = Number(argv.find((a) => a.startsWith("--n="))?.slice(4) ?? 1);
const nomeFonte = argv.find((a) => a.startsWith("--fonte="))?.slice(8) ?? "openverse";

const fonte = FONTES[nomeFonte];
if (!fonte) {
  console.error(`✖ fonte "${nomeFonte}" não existe. Use openverse ou pexels.`);
  process.exit(1);
}

const lista = alvos.length ? alvos : Object.keys(ITENS);

mkdirSync(DESTINO, { recursive: true });
const creditos = existsSync(CREDITOS)
  ? JSON.parse(readFileSync(CREDITOS, "utf8"))
  : {};

for (const slug of lista) {
  const busca = ITENS[slug];
  if (!busca) {
    console.error(`✖ ${slug}: não está na lista`);
    process.exitCode = 1;
    continue;
  }

  try {
    const opcoes = await fonte(busca, opcao);
    const foto = opcoes[opcao - 1];
    if (!foto) throw new Error(`sem resultado para "${busca}"`);

    const resposta = await fetch(foto.url);
    if (!resposta.ok) throw new Error(`imagem respondeu ${resposta.status}`);
    const bytes = await resposta.arrayBuffer();

    // 600px e qualidade 80: o mesmo que o painel aplica no envio.
    const saida = join(DESTINO, `${slug}.webp`);
    await sharp(Buffer.from(bytes))
      .resize(600, 600, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toFile(saida);

    creditos[slug] = { ...foto, fonte: nomeFonte, busca, opcao };
    delete creditos[slug].url;
    console.log(`✓ ${slug} — ${foto.autor} (${foto.licenca})`);
  } catch (erro) {
    console.error(`✖ ${slug}: ${erro.message}`);
    process.exitCode = 1;
  }

  // Sem chave o acervo limita rajada; com chave a pausa não custa nada.
  await espera(700);
}

writeFileSync(CREDITOS, `${JSON.stringify(creditos, null, 2)}\n`);
console.log(`\n${lista.length} item(ns) pelo ${nomeFonte}. Créditos em ${CREDITOS}.`);
