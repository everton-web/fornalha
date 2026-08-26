import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança.
 *
 * O cardápio é uma página pública que qualquer pizzaria manda para os
 * clientes por WhatsApp, então precisa resistir ao básico: ser embutida em
 * site alheio, ter script injetado, vazar o endereço de origem.
 */
const securityHeaders = [
  {
    // Um ano de HTTPS obrigatório, incluindo subdomínios.
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    // Impede o navegador de "adivinhar" que um .txt é na verdade um script.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // O endereço completo só viaja entre páginas nossas.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Nada aqui precisa de câmera, microfone ou localização.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    /*
     * A CSP permite 'unsafe-inline' em script porque o Next injeta os dados
     * da página em tags inline; tirar isso exige nonce em toda requisição, o
     * que quebraria a página estática. `frame-ancestors 'none'` é o que
     * realmente impede a clonagem do cardápio dentro de outro site.
     */
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://brasilapi.com.br",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // O service worker precisa ser buscado sempre: cache velho aqui
        // significa notificação quebrada sem ninguém entender por quê.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
    ];
  },

  // Cabeçalho que entrega a versão do framework não ajuda ninguém além de
  // quem procura versão vulnerável.
  poweredByHeader: false,

  // A tela de instalação e o "atualizar banco" da agência leem os .sql em
  // tempo de execução. O rastreamento automático não os enxerga — eles nunca
  // são importados, só lidos por caminho — e sem estas linhas as duas coisas
  // falham em produção com "arquivo não encontrado", funcionando só no
  // computador de quem programou.
  outputFileTracingIncludes: {
    "/admin/instalar": ["db/migrations/**/*.sql", "db/seed.sql", "db/demo.sql"],
    "/agencia": ["db/migrations/**/*.sql", "db/demo.sql"],
  },
};

export default nextConfig;
