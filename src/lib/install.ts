import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { opcional, sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

/**
 * Instalação pela própria aplicação.
 *
 * Existe por um motivo prático: quem hospeda na nuvem não tem o projeto na
 * máquina, e a credencial do banco mora só no ambiente do servidor. Sem isto,
 * preparar o banco exigiria clonar o repositório e configurar a DATABASE_URL
 * localmente — trabalho que não tem nada a ver com vender pizza.
 *
 * A trava é o próprio estado do banco: **só roda enquanto não existir nenhuma
 * conta de login**. Depois da primeira, esta porta se fecha sozinha e para
 * sempre. Não é um segredo que pode vazar nem uma variável que alguém esquece
 * de tirar; é uma condição que deixa de valer no instante em que o sistema
 * passa a ter dono.
 */

export type EstadoInstalacao = {
  precisaInstalar: boolean;
  temTabelas: boolean;
  contas: number;
  pizzarias: number;
};

/**
 * O que decide se a instalação ainda está aberta.
 *
 * A pergunta certa é "já existe uma conta de agência?", não "já existe algum
 * usuário". Um sistema que rodou como pizzaria única tem donos cadastrados e
 * nenhuma conta de plataforma — e barrar por "existe usuário" trancaria essa
 * pessoa do lado de fora, sem nenhum caminho para dentro que não passasse por
 * SQL na mão.
 *
 * A porta continua fechando sozinha, e para sempre: assim que a primeira conta
 * de agência existir, ninguém mais entra por aqui.
 */
export async function lerEstado(): Promise<EstadoInstalacao> {
  const contas = await opcional(
    async () => {
      const [r] = await sql`select count(*)::int as n from users`;
      return r.n as number;
    },
    null as number | null,
  );

  // users ausente = banco cru, nunca migrado.
  if (contas === null) {
    return { precisaInstalar: true, temTabelas: false, contas: 0, pizzarias: 0 };
  }

  // Coluna ausente = banco anterior à 0010, então não há agência nenhuma.
  const agencias = await opcional(
    async () => {
      const [r] = await sql`
        select count(*)::int as n from users where is_platform_admin
      `;
      return r.n as number;
    },
    0,
  );

  const pizzarias = await opcional(
    async () => {
      const [r] = await sql`select count(*)::int as n from tenants`;
      return r.n as number;
    },
    0,
  );

  return {
    precisaInstalar: agencias === 0,
    temTabelas: true,
    contas,
    pizzarias,
  };
}

/**
 * Aplica todas as migrations, na ordem, e devolve quais rodaram.
 *
 * Existe separada da instalação porque o banco precisa ser atualizado mais de
 * uma vez na vida: a instalação acontece uma vez só, mas toda versão nova que
 * mexe no schema precisa chegar num banco que já roda. Sem isto, um deploy
 * sobe o código novo e deixa o banco para trás — e quem hospeda na nuvem não
 * tem como rodar `npm run db:migrate`, porque não tem o projeto na máquina
 * nem a credencial do banco.
 *
 * As migrations são idempotentes por contrato (`if not exists`, `on conflict`,
 * update no lugar de insert), então rodar todas de novo é seguro e é o que
 * dispensa guardar um registro de quais já passaram.
 */
export async function rodarMigrations(): Promise<string[]> {
  const dir = join(process.cwd(), "db", "migrations");
  const arquivos = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const arquivo of arquivos) {
    // .simple(): cada migration é um script com vários comandos, e o protocolo
    // simples é o que aceita isso numa tacada.
    await sql.unsafe(readFileSync(join(dir, arquivo), "utf8")).simple();
  }

  return arquivos;
}

/**
 * Cria a conta de demonstração e os pedidos que ela mostra.
 *
 * Roda sempre depois das migrations e depois do seed: depende da pizzaria de
 * demonstração existir, e o seed apaga e recria esse tenant. Ver o cabeçalho
 * de db/demo.sql.
 */
export async function prepararDemo(): Promise<void> {
  const caminho = join(process.cwd(), "db", "demo.sql");
  await sql.unsafe(readFileSync(caminho, "utf8")).simple();
}

export type ResultadoInstalacao = {
  migrationsRodadas: string[];
  criouDemo: boolean;
  pizzaria: string;
  email: string;
};

export async function instalar(input: {
  email: string;
  senha: string;
  criarDemo: boolean;
}): Promise<ResultadoInstalacao> {
  // Reconferido aqui, e não só na tela: a ação é um endpoint POST aberto, e
  // proteger apenas a página deixaria a porta destrancada por baixo.
  const estado = await lerEstado();
  if (!estado.precisaInstalar) {
    throw new Error(
      "Este sistema já tem uma conta de agência. Use a tela de login, ou 'Esqueci minha senha'.",
    );
  }

  const arquivos = await rodarMigrations();

  let criouDemo = false;
  const [{ n: pizzarias }] = await sql`select count(*)::int as n from tenants`;

  if (input.criarDemo || pizzarias === 0) {
    await sql
      .unsafe(readFileSync(join(process.cwd(), "db", "seed.sql"), "utf8"))
      .simple();
    criouDemo = true;
  }

  // Depois do seed, porque ele recria o tenant da demonstração.
  await prepararDemo();

  const [tenant] = await sql`
    select id, name from tenants order by created_at limit 1
  `;
  if (!tenant) throw new Error("Não foi possível criar a pizzaria inicial.");

  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.senha);

  await sql.begin(async (tx) => {
    // A primeira conta é da agência: é quem instalou o sistema, e é quem vai
    // cadastrar as pizzarias daqui em diante. Sem isto, quem instala ficaria
    // sem a tela de cadastro e voltaria a depender de linha de comando.
    const [user] = await tx`
      insert into users (email, password_hash, is_platform_admin)
      values (${email}, ${passwordHash}, true)
      on conflict (email) do update set
        password_hash = excluded.password_hash,
        is_platform_admin = true
      returning id
    `;
    // E também dona da pizzaria de demonstração, para ter onde olhar o
    // sistema funcionando sem precisar cadastrar nada antes.
    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant.id}, ${user.id}, 'owner')
      on conflict (tenant_id, user_id) do update set role = excluded.role
    `;
  });

  // Ler de volta separa "não deu erro" de "está lá".
  const [confere] = await sql`
    select 1 from users u
    join tenant_members tm on tm.user_id = u.id
    where u.email = ${email} and tm.tenant_id = ${tenant.id}
  `;
  if (!confere) throw new Error("O acesso não ficou gravado. Tente de novo.");

  return {
    migrationsRodadas: arquivos,
    criouDemo,
    pizzaria: tenant.name as string,
    email,
  };
}
