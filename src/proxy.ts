import { NextResponse, type NextRequest } from "next/server";

import { opcional, sql } from "@/lib/db";

/**
 * Domínio próprio da pizzaria.
 *
 * Quando o cliente abre `pizzariadobairro.com.br`, esta camada descobre de
 * quem é o domínio e serve o cardápio daquela loja como se fosse a raiz do
 * site. A pizzaria some do /slug e passa a ter endereço próprio.
 *
 * No Next 16 o arquivo chama `proxy.ts` (era `middleware.ts`) e roda em
 * Node.js por padrão — é o que permite consultar o banco aqui.
 *
 * Roda em toda visita, então o mapa host → pizzaria fica em memória por um
 * minuto. Domínio muda quando a agência cadastra um, não a cada pedido; uma
 * consulta por requisição seria pagar caro por um dado que quase nunca muda.
 */

const TTL_MS = 60_000;

type Entrada = { slug: string | null; expira: number };
const cache = new Map<string, Entrada>();

/** Caminhos que nunca pertencem a uma pizzaria: são da plataforma. */
const RESERVADOS = ["/admin", "/agencia", "/api", "/_next", "/sw.js"];

function hostLimpo(request: NextRequest): string {
  const bruto =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return bruto.split(":")[0].toLowerCase().replace(/^www\./, "");
}

/**
 * O domínio da própria plataforma não é de pizzaria nenhuma.
 *
 * Sem esta verificação, o domínio da agência cairia na consulta a cada visita
 * para nunca achar nada — e a página inicial pagaria uma ida ao banco à toa.
 */
function ehDaPlataforma(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app") ||
    host === process.env.PLATFORM_HOST?.toLowerCase().replace(/^www\./, "")
  );
}

async function slugDoDominio(host: string): Promise<string | null> {
  const agora = Date.now();
  const guardado = cache.get(host);
  if (guardado && guardado.expira > agora) return guardado.slug;

  // opcional: num banco anterior à 0011 a coluna não existe, e o sistema
  // segue funcionando por /slug como sempre funcionou.
  const linhas = await opcional(
    async () =>
      await sql`
        select slug from tenants
        where custom_domain = ${host} and is_active
        limit 1
      `,
    null,
  );

  const slug = (linhas?.[0]?.slug as string | undefined) ?? null;

  // O "não achei" também é guardado: quem aponta um domínio errado para cá
  // não vira uma consulta ao banco por requisição.
  cache.set(host, { slug, expira: agora + TTL_MS });
  return slug;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RESERVADOS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const host = hostLimpo(request);
  if (!host || ehDaPlataforma(host)) return NextResponse.next();

  const slug = await slugDoDominio(host);
  if (!slug) return NextResponse.next();

  // Já está no caminho certo (alguém digitou o /slug no domínio próprio):
  // reescrever de novo viraria /slug/slug.
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${slug}` : `/${slug}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Arquivo com extensão é asset: fica de fora para não pagar a checagem de
  // host em cada imagem do cardápio.
  matcher: ["/((?!_next/|.*\\.[\\w]+$).*)"],
};
