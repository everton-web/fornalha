import { ImageResponse } from "next/og";

/**
 * Ícone do app instalado e da notificação.
 *
 * A arte fica escrita aqui, e não lida de public/: em serverless o arquivo só
 * existe no pacote se for rastreado, e um ícone que some em produção aparece
 * como quadrado cinza no celular de quem instalou — sem erro em log nenhum.
 *
 * Gerado sob demanda porque são três tamanhos, o navegador busca cada um uma
 * vez, e assim a marca vive num lugar só.
 */

const TAMANHOS = [96, 192, 512] as const;

/** Fatia com a chama, com volume — é a marca em tamanho grande. */
const MARCA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs>
<linearGradient id="t" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#e33b2b"/><stop offset="1" stop-color="#a81616"/></linearGradient>
<linearGradient id="f" x1="0.3" y1="1" x2="0.7" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset="0.45" stop-color="#ffa421"/><stop offset="1" stop-color="#ff6a2b"/></linearGradient>
<linearGradient id="q" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#fff6e2"/><stop offset="0.55" stop-color="#f7dfae"/><stop offset="1" stop-color="#e8c489"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#e8a25a"/><stop offset="1" stop-color="#c9762f"/></linearGradient>
<radialGradient id="g" cx="0.32" cy="0.2" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="120" height="120" rx="26" fill="url(#t)"/>
<rect width="120" height="120" rx="26" fill="url(#g)"/>
<path fill="url(#f)" d="M62 52C51 47 45 37 49 24c2 6 6 8 8 6C56 17 63 8 73 4c-4 13 2 19 4 27 2 10-5 21-15 21Z"/>
<path fill="#ffe9a8" opacity="0.85" d="M63 46c-6-3-9-9-7-17 2 4 4 5 5 4 0-9 4-15 9-18-2 8 1 12 2 17 1 7-3 14-9 14Z"/>
<path fill="url(#b)" d="M60 110 24 60c11-10 23-14 36-14s25 4 36 14Z"/>
<path fill="url(#q)" d="M60 103 30 61c9-8 19-11 30-11s21 3 30 11Z"/>
<circle cx="47" cy="69" r="5" fill="#c0342a"/><circle cx="45.6" cy="67.6" r="3.4" fill="#e4584a"/>
<circle cx="70" cy="66" r="4.6" fill="#c0342a"/><circle cx="68.8" cy="64.7" r="3.1" fill="#e4584a"/>
<circle cx="60" cy="85" r="4.4" fill="#c0342a"/><circle cx="58.9" cy="83.8" r="3" fill="#e4584a"/>
</svg>`;

/**
 * O badge do Android é recortado como silhueta: só a forma importa, a cor é
 * descartada. Então aqui a marca é branca sobre nada, e sem os pepperonis —
 * furos de 4px viram sujeira num badge de 24px na barra de status.
 */
const BADGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<path fill="#fff" d="M62 52C51 47 45 37 49 24c2 6 6 8 8 6C56 17 63 8 73 4c-4 13 2 19 4 27 2 10-5 21-15 21Z"/>
<path fill="#fff" d="M60 110 24 60c11-10 23-14 36-14s25 4 36 14Z"/>
</svg>`;

function dataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tamanho: string }> },
) {
  const { tamanho } = await params;
  const lado = Number(tamanho);

  if (!TAMANHOS.includes(lado as (typeof TAMANHOS)[number])) {
    return new Response("Tamanho não disponível", { status: 404 });
  }

  const badge = new URL(request.url).searchParams.get("badge") === "1";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: lado, height: lado }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri(badge ? BADGE : MARCA)} width={lado} height={lado} alt="" />
      </div>
    ),
    {
      width: lado,
      height: lado,
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    },
  );
}
