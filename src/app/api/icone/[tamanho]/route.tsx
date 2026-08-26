import { ImageResponse } from "next/og";

/**
 * Ícone do app instalado.
 *
 * Gerado sob demanda em vez de ficar como arquivo no repositório: são poucos
 * tamanhos, mudam junto com a marca e o navegador busca cada um uma única vez.
 */

const TAMANHOS = [96, 192, 512] as const;
const MARCA = "#c81e1e";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tamanho: string }> },
) {
  const { tamanho } = await params;
  const lado = Number(tamanho);

  if (!TAMANHOS.includes(lado as (typeof TAMANHOS)[number])) {
    return new Response("Tamanho não disponível", { status: 404 });
  }

  // O badge do Android é recortado como silhueta: fundo transparente, forma branca.
  const badge = new URL(request.url).searchParams.get("badge") === "1";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: lado,
          height: lado,
          alignItems: "center",
          justifyContent: "center",
          background: badge ? "transparent" : MARCA,
          color: "#ffffff",
          fontSize: Math.round(lado * 0.6),
          fontWeight: 700,
        }}
      >
        F
      </div>
    ),
    {
      width: lado,
      height: lado,
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    },
  );
}
