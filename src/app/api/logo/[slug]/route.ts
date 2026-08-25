import { createHash } from "node:crypto";

import { sql } from "@/lib/db";

/**
 * Serve a logo enviada pelo painel.
 *
 * A imagem mora no banco, mas não pode viajar junto com o cardápio em toda
 * visita — por isso ela sai por aqui, com cache e ETag, e o HTML carrega só
 * o endereço.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const rows = await sql`
    select logo_data, logo_type from tenants
    where slug = ${slug} and is_active = true
    limit 1
  `;

  const data = rows[0]?.logo_data as string | undefined;
  if (!data) return new Response("Sem logo", { status: 404 });

  // O data URI guarda o base64 depois da vírgula.
  const base64 = data.slice(data.indexOf(",") + 1);
  const bytes = Buffer.from(base64, "base64");
  const tipo = (rows[0]?.logo_type as string) || "image/png";

  const etag = `"${createHash("sha1").update(base64).digest("hex").slice(0, 16)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(bytes.length),
      ETag: etag,
      // Curto de propósito: a pizzaria troca a logo e quer ver no ar na hora.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    },
  });
}
