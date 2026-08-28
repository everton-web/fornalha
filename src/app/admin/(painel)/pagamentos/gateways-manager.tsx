"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Plus, Trash2, X } from "lucide-react";

import {
  alternarGateway,
  conectarGateway,
  desconectarGateway,
} from "@/app/admin/payment-actions";

type CredentialField = {
  name: string;
  label: string;
  help?: string;
  secret: boolean;
  optional?: boolean;
};

type Gateway = {
  id: string;
  label: string;
  summary: string;
  supports: string[];
  credentialFields: CredentialField[];
};

type Conta = {
  provider: string;
  label: string;
  acceptsPix: boolean;
  acceptsCard: boolean;
  isActive: boolean;
  hint: string | null;
};

/**
 * Onde a pizzaria liga e desliga gateway.
 *
 * A credencial nunca volta do servidor: ao reconectar, os campos vêm vazios e
 * o que for salvo substitui o que estava. É de propósito — token de
 * recebimento não fica pendurado em campo de formulário esperando alguém
 * abrir o inspetor do navegador.
 */
export function GatewaysManager({
  gateways,
  contas,
  canEdit,
  baseUrl,
}: {
  gateways: Gateway[];
  contas: Conta[];
  canEdit: boolean;
  /** Vem do servidor: é ele que sabe o domínio público, não o navegador. */
  baseUrl: string;
}) {
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const conectados = new Map(contas.map((c) => [c.provider, c]));

  function rodar(acao: () => Promise<{ ok: boolean; error?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.error ?? "Não foi possível concluir.");
      else setAbrindo(null);
    });
  }

  return (
    <div className="space-y-4">
      {erro && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {gateways.map((gateway) => {
        const conta = conectados.get(gateway.id);
        const aberto = abrindo === gateway.id;

        return (
          <section
            key={gateway.id}
            className="rounded-3xl border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{gateway.label}</h2>
                  {conta &&
                    (conta.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        Ligado
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
                        Pausado
                      </span>
                    ))}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{gateway.summary}</p>

                {conta && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[
                      conta.acceptsPix && "Pix",
                      conta.acceptsCard && "Cartão",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {conta.hint && ` · credencial terminada em ${conta.hint}`}
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex shrink-0 gap-2">
                  {conta && (
                    <>
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() =>
                          rodar(() =>
                            alternarGateway(gateway.id, !conta.isActive),
                          )
                        }
                        className="rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-stone-300 disabled:opacity-50"
                      >
                        {conta.isActive ? "Pausar" : "Religar"}
                      </button>
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => {
                          if (
                            confirm(
                              `Desconectar ${gateway.label}? Os pedidos já pagos continuam como estão.`,
                            )
                          ) {
                            rodar(() => desconectarGateway(gateway.id));
                          }
                        }}
                        className="grid size-9 place-items-center rounded-full border border-line text-red-600 transition hover:border-red-300 disabled:opacity-50"
                        aria-label={`Desconectar ${gateway.label}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setErro(null);
                      setAbrindo(aberto ? null : gateway.id);
                    }}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
                    style={{
                      background: aberto ? "var(--line)" : "var(--brand)",
                      color: aberto ? "inherit" : "var(--brand-ink)",
                    }}
                  >
                    {aberto ? (
                      <>
                        <X className="size-4" /> Fechar
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        {conta ? "Trocar credencial" : "Conectar"}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {aberto && canEdit && (
              <FormularioConexao
                gateway={gateway}
                pendente={pendente}
                webhookUrl={`${baseUrl}/api/pagamentos/${gateway.id}/webhook`}
                onSubmit={(dados) => rodar(() => conectarGateway(dados))}
              />
            )}
          </section>
        );
      })}

      <p className="rounded-3xl border border-dashed border-line px-5 py-4 text-sm text-muted-foreground">
        Vai receber por outro gateway? Asaas, Pagar.me (Stone), InfinitePay,
        PicPay e Stripe entram sem mexer no resto do sistema — é só pedir.
        <br />
        <span className="text-xs">
          Pix funciona igual em qualquer um deles: o cliente paga do banco que
          quiser, inclusive Nubank, sem integração separada.
        </span>
      </p>
    </div>
  );
}

function FormularioConexao({
  gateway,
  pendente,
  webhookUrl,
  onSubmit,
}: {
  gateway: Gateway;
  pendente: boolean;
  webhookUrl: string;
  onSubmit: (dados: {
    provider: string;
    credentials: Record<string, string>;
    acceptsPix: boolean;
    acceptsCard: boolean;
  }) => void;
}) {
  const [credenciais, setCredenciais] = useState<Record<string, string>>({});
  const [pix, setPix] = useState(gateway.supports.includes("pix"));
  const [cartao, setCartao] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão: o endereço continua na tela para copiar na mão
    }
  }

  return (
    <form
      className="mt-5 space-y-4 border-t border-line pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          provider: gateway.id,
          credentials: credenciais,
          acceptsPix: pix,
          acceptsCard: cartao,
        });
      }}
    >
      {gateway.credentialFields.map((campo) => (
        <label key={campo.name} className="block">
          <span className="text-sm font-medium">{campo.label}</span>
          {campo.help && (
            <span className="mt-0.5 block text-xs text-muted-foreground">{campo.help}</span>
          )}
          <input
            type={campo.secret ? "password" : "text"}
            autoComplete="off"
            spellCheck={false}
            value={credenciais[campo.name] ?? ""}
            onChange={(event) =>
              setCredenciais((atual) => ({
                ...atual,
                [campo.name]: event.target.value,
              }))
            }
            className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2 font-mono text-sm outline-none focus:border-stone-400"
            placeholder={campo.secret ? "cole aqui" : ""}
          />
        </label>
      ))}

      <div className="flex flex-wrap gap-4">
        {gateway.supports.includes("pix") && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pix}
              onChange={(event) => setPix(event.target.checked)}
              className="size-4"
            />
            Receber por Pix
          </label>
        )}
        {gateway.supports.includes("card") && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cartao}
              onChange={(event) => setCartao(event.target.checked)}
              className="size-4"
            />
            Receber por cartão
          </label>
        )}
      </div>

      <div className="rounded-2xl bg-background p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
          <Link2 className="size-3.5" />
          Endereço do webhook
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastre este endereço no painel do {gateway.label}. É por ele que o
          gateway avisa quando um pagamento cai.
        </p>
        <div className="mt-2 flex gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={copiar}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line transition hover:border-stone-300"
            aria-label="Copiar endereço do webhook"
          >
            {copiado ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
        style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
      >
        {pendente ? "Salvando…" : "Salvar e ligar"}
      </button>
    </form>
  );
}
