"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  DatabaseZap,
  ExternalLink,
  Globe,
  KeyRound,
  Plus,
  Store,
  X,
} from "lucide-react";

import {
  alternarPizzaria,
  atualizarBanco,
  cadastrarPizzaria,
  definirDominio,
  trocarSenhaDoDono,
} from "@/app/agencia/actions";
import type { PizzariaNaAgencia } from "@/lib/agencia";
import { money } from "@/lib/format";

/** Sugere o endereço a partir do nome, sem impedir a pessoa de mudar. */
function sugereSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function senhaForte(): string {
  const alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export function PizzariasManager({
  pizzarias,
}: {
  pizzarias: PizzariaNaAgencia[];
}) {
  const [cadastrando, setCadastrando] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Pizzarias
        </h2>
        <button
          type="button"
          onClick={() => setCadastrando((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white"
        >
          {cadastrando ? (
            <>
              <X className="size-4" /> Fechar
            </>
          ) : (
            <>
              <Plus className="size-4" /> Nova pizzaria
            </>
          )}
        </button>
      </div>

      {cadastrando && <FormularioNova onPronto={() => setCadastrando(false)} />}

      {pizzarias.length === 0 && !cadastrando && (
        <div className="rounded-3xl border border-dashed border-line px-5 py-10 text-center">
          <Store className="mx-auto size-8 text-stone-400" />
          <p className="mt-3 font-medium">Nenhuma pizzaria ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre a primeira e entregue os dois links ao dono.
          </p>
        </div>
      )}

      {pizzarias.map((p) => (
        <LinhaPizzaria key={p.id} pizzaria={p} />
      ))}

      <AtualizarBanco />
    </div>
  );
}

/**
 * Põe o banco em dia com o código que está no ar.
 *
 * Fica no rodapé da tela, discreto: não é coisa do dia a dia da agência, é
 * o que se aperta depois de uma versão nova que mexeu no banco.
 */
function AtualizarBanco() {
  const [estado, setEstado] = useState<
    { tipo: "pronto"; migrations: number } | { tipo: "erro"; msg: string } | null
  >(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="mt-6 rounded-2xl border border-line px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-48 flex-1">
          <p className="text-sm font-semibold">Atualizar o banco</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Um deploy sobe o código, não o banco. Depois de uma versão que mexeu
            no schema, aperte aqui uma vez. Rodar de novo não estraga nada.
          </p>
        </div>
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              setEstado(null);
              const r = await atualizarBanco();
              setEstado(
                r.ok
                  ? { tipo: "pronto", migrations: r.dados.migrations }
                  : { tipo: "erro", msg: r.error },
              );
            })
          }
          className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-stone-400 disabled:opacity-40"
        >
          <DatabaseZap className="size-4" />
          {pendente ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {estado?.tipo === "pronto" && (
        <p className="mt-2 text-xs font-medium text-green-700">
          Banco em dia — {estado.migrations} migrations aplicadas.
        </p>
      )}
      {estado?.tipo === "erro" && (
        <p className="mt-2 text-xs font-medium text-red-600">{estado.msg}</p>
      )}
    </div>
  );
}

function FormularioNova({ onPronto }: { onPronto: () => void }) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(senhaForte);
  const [whatsapp, setWhatsapp] = useState("");
  const [cor, setCor] = useState("#c81e1e");
  const [erro, setErro] = useState<string | null>(null);
  const [criada, setCriada] = useState<{ slug: string; email: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  if (criada) {
    return (
      <Entregavel
        slug={criada.slug}
        email={criada.email}
        senha={senha}
        onFechar={onPronto}
      />
    );
  }

  return (
    <form
      className="rounded-3xl border border-line bg-surface p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await cadastrarPizzaria({
            nome,
            slug,
            email,
            senha,
            cor,
            whatsapp,
          });
          if (!r.ok) return setErro(r.error);
          setCriada(r.dados);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Nome da pizzaria
          </span>
          <input
            required
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (!slugEditado) setSlug(sugereSlug(e.target.value));
            }}
            placeholder="Dom Luigi"
            className="w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-stone-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Endereço do cardápio
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-background px-3 py-2.5">
            <span className="shrink-0 text-sm text-muted-foreground">/</span>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugEditado(true);
                setSlug(sugereSlug(e.target.value));
              }}
              placeholder="dom-luigi"
              className="w-full bg-transparent font-mono text-sm outline-none"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            E-mail do dono
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dono@domluigi.com.br"
            className="w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-stone-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Senha inicial
          </span>
          <div className="flex gap-2">
            <input
              required
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border border-line bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-stone-400"
            />
            <button
              type="button"
              onClick={() => setSenha(senhaForte())}
              className="shrink-0 rounded-xl border border-line px-3 text-xs font-medium transition hover:border-stone-300"
            >
              Sortear
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            WhatsApp (opcional)
          </span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="11987654321"
            inputMode="tel"
            className="w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-stone-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Cor da marca
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="size-11 shrink-0 cursor-pointer rounded-xl border border-line bg-background"
            />
            <input
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="w-full rounded-xl border border-line bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-stone-400"
            />
          </div>
        </label>
      </div>

      {erro && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="mt-4 w-full rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pendente ? "Criando…" : "Criar pizzaria"}
      </button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Ela já nasce com tamanhos, categorias, bordas e faixas de preço. O dono
        entra e cadastra os sabores.
      </p>
    </form>
  );
}

/**
 * O que a agência entrega ao cliente.
 *
 * Aparece uma vez só: a senha não volta do banco depois (fica em hash), então
 * é aqui que ela precisa ser copiada.
 */
function Entregavel({
  slug,
  email,
  senha,
  onFechar,
}: {
  slug: string;
  email: string;
  senha: string;
  onFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const texto = `Seu sistema de pedidos está pronto!

Cardápio para divulgar:
${typeof window !== "undefined" ? window.location.origin : ""}/${slug}

Painel para receber os pedidos:
${typeof window !== "undefined" ? window.location.origin : ""}/admin

Login: ${email}
Senha: ${senha}

Troque a senha assim que entrar.`;

  return (
    <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-5">
      <h3 className="font-bold text-emerald-900">Pizzaria criada</h3>
      <p className="mt-1 text-sm text-emerald-900">
        Copie e mande para o dono. <strong>A senha não aparece de novo</strong> —
        ela fica guardada em hash e nem eu consigo lê-la depois.
      </p>

      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-emerald-200 bg-white px-3 py-3 text-xs leading-relaxed text-stone-700">
        {texto}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2500);
            } catch {
              // sem permissão: o texto continua na tela para copiar na mão
            }
          }}
          className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
        >
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? "Copiado" : "Copiar mensagem"}
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}

function LinhaPizzaria({ pizzaria: p }: { pizzaria: PizzariaNaAgencia }) {
  const [trocando, setTrocando] = useState(false);
  const [editandoDominio, setEditandoDominio] = useState(false);
  const [dominio, setDominio] = useState(p.dominio ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <section
      className={`rounded-3xl border bg-surface p-5 ${
        p.ativa ? "border-line" : "border-dashed border-stone-300 opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="mt-0.5 size-9 shrink-0 rounded-xl"
          style={{ background: p.cor }}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.nome}</h3>
            {!p.ativa && (
              <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-600">
                Desligada
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/${p.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              /{p.slug}
              <ExternalLink className="size-3" />
            </Link>
            {p.dominio && (
              <a
                href={`https://${p.dominio}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 font-mono text-xs font-medium text-stone-700"
              >
                <Globe className="size-3" />
                {p.dominio}
              </a>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {p.donoEmail ?? "sem dono cadastrado"}
          </p>
        </div>

        <dl className="flex shrink-0 gap-5 text-right">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-stone-500">
              Sabores
            </dt>
            <dd className="font-semibold tabular-nums">{p.sabores}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-stone-500">
              Pedidos 30d
            </dt>
            <dd className="font-semibold tabular-nums">{p.pedidos30d}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-stone-500">
              Movimento 30d
            </dt>
            <dd className="font-semibold tabular-nums">{money(p.faturamento30d)}</dd>
          </div>
        </dl>
      </div>

      {aviso && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {aviso}
        </p>
      )}

      {editandoDominio ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Depois de salvar aqui, cadastre o mesmo domínio na Vercel
            (Settings → Domains) e aponte o DNS para lá. Deixe em branco para
            voltar a usar só <code>/{p.slug}</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              placeholder="pizzariadobairro.com.br"
              className="min-w-56 flex-1 rounded-xl border border-line bg-background px-3 py-2 font-mono text-sm outline-none focus:border-stone-400"
            />
            <button
              type="button"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await definirDominio(p.id, dominio);
                  if (!r.ok) return setAviso(r.error);
                  setAviso(
                    r.dados.dominio
                      ? `Domínio salvo. Falta cadastrá-lo na Vercel e apontar o DNS.`
                      : "Domínio removido. A pizzaria volta a atender só pelo /slug.",
                  );
                  setEditandoDominio(false);
                })
              }
              className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setDominio(p.dominio ?? "");
                setEditandoDominio(false);
              }}
              className="rounded-full border border-line px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : trocando ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <input
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="nova senha do dono"
            className="min-w-48 flex-1 rounded-xl border border-line bg-background px-3 py-2 font-mono text-sm outline-none focus:border-stone-400"
          />
          <button
            type="button"
            disabled={pendente || novaSenha.length < 8}
            onClick={() =>
              iniciar(async () => {
                const r = await trocarSenhaDoDono(p.id, novaSenha);
                if (!r.ok) return setAviso(r.error);
                setAviso(
                  `Senha trocada. Mande para ${r.dados.email}: ${novaSenha}`,
                );
                setTrocando(false);
                setNovaSenha("");
              })
            }
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setTrocando(false)}
            className="rounded-full border border-line px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="button"
            disabled={pendente}
            onClick={() => {
              setAviso(null);
              setEditandoDominio(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-stone-300 disabled:opacity-40"
          >
            <Globe className="size-3.5" />
            {p.dominio ? "Trocar domínio" : "Domínio próprio"}
          </button>

          <button
            type="button"
            disabled={pendente}
            onClick={() => {
              setAviso(null);
              setNovaSenha(senhaForte());
              setTrocando(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-stone-300 disabled:opacity-40"
          >
            <KeyRound className="size-3.5" />
            Trocar senha do dono
          </button>

          <button
            type="button"
            disabled={pendente}
            onClick={() => {
              if (
                p.ativa &&
                !confirm(
                  `Desligar ${p.nome}? O cardápio sai do ar e o dono não entra no painel. Nada é apagado.`,
                )
              ) {
                return;
              }
              iniciar(async () => {
                await alternarPizzaria(p.id, !p.ativa);
              });
            }}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
              p.ativa
                ? "border-line hover:border-red-300 hover:text-red-600"
                : "border-emerald-300 text-emerald-700"
            }`}
          >
            {p.ativa ? "Desligar" : "Religar"}
          </button>
        </div>
      )}
    </section>
  );
}
