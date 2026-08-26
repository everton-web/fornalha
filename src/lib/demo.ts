/**
 * A pizzaria de demonstração.
 *
 * Ela existe para ser mostrada a quem ainda não é cliente, e por isso ganha
 * um par de facilidades que nenhuma pizzaria de verdade deve ter — hoje, o
 * CEP já preenchido no checkout. Cada uma dessas exceções mora aqui, e não
 * espalhada por `if (slug === "bella-napoli")` pelo código.
 */
export const DEMO_SLUG = "bella-napoli";

/**
 * CEP que a demo deixa pronto no checkout, para a taxa de entrega aparecer
 * sem ninguém digitar nada.
 *
 * É a Pituba (R$ 12,00), não o Rio Vermelho da própria loja: o bairro da
 * pizzaria cobraria a taxa mais barata da tabela, e o que se quer mostrar é
 * justamente que a taxa muda com o bairro.
 */
export const DEMO_CEP_CLIENTE = "41830000";

export function isDemo(slug: string): boolean {
  return slug === DEMO_SLUG;
}
