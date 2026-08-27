/**
 * A marca da Fornalha.
 *
 * Com o azulejo vermelho, e não como silhueta de uma cor só: sem o contraste
 * do fundo, a chama e a fatia grudam num vulto que lê como naipe de baralho.
 * Conferido lado a lado nos tamanhos de uso real — 14, 16, 20 e 28 px.
 *
 * Sem os pepperonis, que a versão do ícone tem: furos de 4 px viram sujeita
 * num selo de 14. Eles voltam a partir de uns 64 px, no ícone do app.
 *
 * Desenhada aqui em vez de `<img src="/marca.svg">` para não custar uma
 * requisição numa página que já carrega três prints. O arquivo em
 * public/marca.svg e marca-3d.svg existe para uso fora do site — proposta,
 * assinatura de e-mail, adesivo.
 */
export function Marca({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className}>
      <rect width="120" height="120" rx="26" fill="#c81e1e" />
      <path
        fill="#fdf6ec"
        d="M62 50C51 45 45 35 49 22c2 6 6 8 8 6C56 15 63 6 73 2c-4 13 2 19 4 27 2 10-5 21-15 21Z"
      />
      <path
        fill="#fdf6ec"
        d="M60 110 26 62c10-9 21-13 34-13s24 4 34 13Z"
      />
    </svg>
  );
}
