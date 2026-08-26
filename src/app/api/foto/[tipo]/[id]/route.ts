import { createHash } from "node:crypto";

import { sql } from "@/lib/db";

/**
 * Serve a foto de um sabor ou de um produto.
 *
 * Mesma ideia da logo: a imagem mora no banco, mas não viaja junto com o
 * cardápio. Um cardápio de 60 sabores com as fotos embutidas seriam alguns
 * megabytes em toda visita — aqui cada foto sai sozinha, com cache e ETag, e o
 * navegador só volta a buscar o que mudou.
 */

const TABELAS = { sabor: "flavors", produto: "products" } as const;

type Tipo = keyof typeof TABELAS;

function isTipo(value: string): value is Tipo {
  return value === "sabor" || value === "produto";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> },
) {
  const { tipo, id } = await params;

  if (!isTipo(tipo)) return new Response("Tipo inválido", { status: 404 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Id inválido", { status: 404 });
  }

  // O nome da tabela sai de um mapa fixo, nunca da URL: `tipo` já passou pelo
  // isTipo acima, então o sql.unsafe só recebe 'flavors' ou 'products'.
  const tabela = TABELAS[tipo];

  const rows = await sql`
    select image_data, image_type
    from ${sql.unsafe(tabela)}
    where id = ${id} and is_active = true
    limit 1
  `;

  const data = rows[0]?.image_data as string | undefined;
  if (!data) return new Response("Sem foto", { status: 404 });

  const base64 = data.slice(data.indexOf(",") + 1);
  const bytes = Buffer.from(base64, "base64");
  const mime = (rows[0]?.image_type as string) || "image/webp";

  const etag = `"${createHash("sha1").update(base64).digest("hex").slice(0, 16)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      ETag: etag,
      // Curto: a pizzaria troca a foto e quer ver no ar na hora. O ETag evita
      // que "curto" signifique baixar tudo de novo a cada minuto.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    },
  });
}
