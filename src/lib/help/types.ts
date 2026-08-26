/** Blocos de conteúdo da ajuda. Poucos e simples de propósito: quem escreve
 *  artigo novo não deveria precisar pensar em layout. */
export type Block =
  | { kind: "p"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "tip"; text: string }
  | { kind: "warn"; text: string };

export type Article = {
  slug: string;
  title: string;
  summary: string;
  section: string;
  /** termos que a pessoa digitaria na busca sem usar as palavras do título */
  keywords: string[];
  body: Block[];
};

/** Texto corrido do artigo, para a busca olhar dentro do conteúdo também. */
export function articleText(article: Article): string {
  const corpo = article.body
    .map((b) => ("text" in b ? b.text : b.items.join(" ")))
    .join(" ");
  return `${article.title} ${article.summary} ${article.keywords.join(" ")} ${corpo}`;
}
