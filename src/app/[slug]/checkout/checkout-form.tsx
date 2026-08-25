"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Bike,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { formatPhone, isValidPhone, money, onlyDigits } from "@/lib/format";
import type { DeliveryType, PaymentMethod, Tenant } from "@/lib/types";

import { useCart } from "../_components/cart-provider";
import { createOrder } from "../actions";

const CUSTOMER_KEY = "fornalha:customer";

type CustomerDraft = {
  name: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  zip: string;
  reference: string;
};

const EMPTY: CustomerDraft = {
  name: "",
  phone: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  zip: "",
  reference: "",
};

export function CheckoutForm({
  slug,
  tenant,
  isOpen,
}: {
  slug: string;
  tenant: Tenant;
  isOpen: boolean;
}) {
  const router = useRouter();
  const { items, priced, subtotal, count, ready, setQuantity, remove, clear } =
    useCart();

  const [customer, setCustomer] = useState<CustomerDraft>(EMPTY);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    tenant.delivery_enabled ? "delivery" : "pickup",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Quem já pediu uma vez não digita o endereço de novo.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOMER_KEY);
      // Mesmo caso do carrinho: o rascunho salvo só pode ser lido no cliente.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCustomer({ ...EMPTY, ...(JSON.parse(raw) as CustomerDraft) });
    } catch {
      // sem dados salvos, segue com formulário vazio
    }
  }, []);

  const deliveryFee = deliveryType === "delivery" ? tenant.delivery_fee : 0;
  const total = subtotal + deliveryFee;
  const belowMinimum = subtotal < tenant.min_order_value;

  const paymentOptions = buildPaymentOptions(tenant);

  function set<K extends keyof CustomerDraft>(key: K, value: string) {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setError(null);

    if (!isOpen) return setError("A pizzaria está fechada no momento.");
    if (count === 0) return setError("Seu carrinho está vazio.");
    if (customer.name.trim().length < 2) return setError("Informe seu nome.");
    if (!isValidPhone(customer.phone)) return setError("Informe um telefone válido com DDD.");
    if (deliveryType === "delivery" && (!customer.street.trim() || !customer.number.trim()))
      return setError("Informe rua e número para a entrega.");
    if (!paymentMethod) return setError("Escolha a forma de pagamento.");
    if (belowMinimum)
      return setError(`O pedido mínimo é de ${money(tenant.min_order_value)}.`);

    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    } catch {
      // salvar é conveniência, não requisito
    }

    startTransition(async () => {
      const result = await createOrder({
        slug,
        items,
        name: customer.name,
        phone: onlyDigits(customer.phone),
        deliveryType,
        street: customer.street,
        number: customer.number,
        complement: customer.complement,
        district: customer.district,
        city: customer.city,
        zip: customer.zip,
        reference: customer.reference,
        paymentMethod,
        changeFor:
          paymentMethod === "cash" && changeFor
            ? Number(changeFor.replace(",", "."))
            : null,
        notes,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      clear();
      router.push(`/${slug}/pedido/${result.token}`);
    });
  }

  if (!ready) {
    return <p className="py-10 text-center text-sm text-muted">Carregando…</p>;
  }

  if (count === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <p className="font-semibold">Seu carrinho está vazio</p>
        <p className="mt-1 text-sm text-muted">
          Escolha uma pizza para começar seu pedido.
        </p>
        <Link
          href={`/${slug}`}
          className="mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-semibold"
          style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
        >
          Ver cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------- itens */}
      <Card title="Seu pedido">
        <ul className="divide-y divide-line">
          {priced.map((item) => (
            <li key={item.uid} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{item.title}</p>
                {item.subtitle && (
                  <p className="text-sm text-muted">{item.subtitle}</p>
                )}
                {item.notes && (
                  <p className="mt-0.5 text-xs italic text-muted">“{item.notes}”</p>
                )}
                <p className="mt-1 text-sm font-semibold">{money(item.totalPrice)}</p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center gap-1 rounded-full border border-line p-0.5">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.uid, item.quantity - 1)}
                    className="grid size-7 place-items-center rounded-full hover:bg-stone-100"
                    aria-label="Diminuir"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.uid, item.quantity + 1)}
                    className="grid size-7 place-items-center rounded-full hover:bg-stone-100"
                    aria-label="Aumentar"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.uid)}
                  className="flex items-center gap-1 text-xs text-muted hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href={`/${slug}`}
          className="mt-3 inline-block text-sm font-medium"
          style={{ color: "var(--brand)" }}
        >
          + Adicionar mais itens
        </Link>
      </Card>

      {/* ------------------------------------------------------- entrega */}
      <Card title="Entrega">
        <div className="grid grid-cols-2 gap-2">
          {tenant.delivery_enabled && (
            <Choice
              selected={deliveryType === "delivery"}
              onClick={() => setDeliveryType("delivery")}
              icon={<Bike className="size-4" />}
              title="Entrega"
              subtitle={
                tenant.delivery_fee > 0 ? money(tenant.delivery_fee) : "Grátis"
              }
            />
          )}
          {tenant.pickup_enabled && (
            <Choice
              selected={deliveryType === "pickup"}
              onClick={() => setDeliveryType("pickup")}
              icon={<ShoppingBag className="size-4" />}
              title="Retirar no local"
              subtitle="Sem taxa"
            />
          )}
        </div>

        {deliveryType === "pickup" && tenant.address && (
          <p className="mt-3 rounded-xl bg-background px-3 py-2.5 text-sm text-muted">
            Retirada em {tenant.address}
          </p>
        )}

        {deliveryType === "delivery" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              label="Rua"
              value={customer.street}
              onChange={(v) => set("street", v)}
              placeholder="Av. Brasil"
            />
            <Field
              label="Número"
              value={customer.number}
              onChange={(v) => set("number", v)}
              placeholder="123"
            />
            <Field
              label="Complemento"
              value={customer.complement}
              onChange={(v) => set("complement", v)}
              placeholder="Apto 42, bloco B"
              optional
            />
            <Field
              label="Bairro"
              value={customer.district}
              onChange={(v) => set("district", v)}
            />
            <Field
              label="Cidade"
              value={customer.city}
              onChange={(v) => set("city", v)}
            />
            <Field
              className="sm:col-span-2"
              label="Ponto de referência"
              value={customer.reference}
              onChange={(v) => set("reference", v)}
              placeholder="Portão verde, ao lado da farmácia"
              optional
            />
          </div>
        )}
      </Card>

      {/* --------------------------------------------------------- dados */}
      <Card title="Seus dados">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Nome"
            value={customer.name}
            onChange={(v) => set("name", v)}
            placeholder="Como podemos te chamar"
          />
          <Field
            label="WhatsApp / telefone"
            value={customer.phone}
            onChange={(v) => set("phone", formatPhone(v))}
            placeholder="(11) 98765-4321"
            inputMode="tel"
          />
        </div>
      </Card>

      {/* ----------------------------------------------------- pagamento */}
      <Card title="Pagamento">
        <div className="grid gap-2 sm:grid-cols-2">
          {paymentOptions.map((option) => (
            <Choice
              key={option.value}
              selected={paymentMethod === option.value}
              onClick={() => setPaymentMethod(option.value)}
              icon={option.icon}
              title={option.title}
              subtitle={option.subtitle}
            />
          ))}
        </div>

        {paymentMethod === "cash" && (
          <div className="mt-3">
            <Field
              label="Precisa de troco para quanto?"
              value={changeFor}
              onChange={setChangeFor}
              placeholder={`Ex: ${Math.ceil(total / 10) * 10}`}
              inputMode="decimal"
              optional
            />
          </div>
        )}

        {paymentMethod === "pix_manual" && tenant.pix_key && (
          <p className="mt-3 rounded-xl bg-background px-3 py-2.5 text-sm">
            <span className="text-muted">Chave Pix: </span>
            <strong className="font-mono">{tenant.pix_key}</strong>
            <span className="mt-1 block text-xs text-muted">
              Envie o comprovante no WhatsApp depois de finalizar.
            </span>
          </p>
        )}
      </Card>

      <Card title="Observações do pedido">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Alguma informação para a cozinha ou o entregador?"
          className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-stone-400"
        />
      </Card>

      {/* -------------------------------------------------------- resumo */}
      <Card title="Resumo">
        <dl className="space-y-1.5 text-sm">
          <Row label="Subtotal" value={money(subtotal)} />
          <Row
            label="Taxa de entrega"
            value={deliveryFee > 0 ? money(deliveryFee) : "Grátis"}
          />
          <div className="border-t border-line pt-2">
            <Row label="Total" value={money(total)} strong />
          </div>
        </dl>

        {belowMinimum && (
          <p className="mt-3 text-sm text-amber-700">
            Faltam {money(tenant.min_order_value - subtotal)} para atingir o
            pedido mínimo.
          </p>
        )}
      </Card>

      {error && (
        <p className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !isOpen}
            className="flex w-full items-center justify-between gap-3 rounded-full px-5 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
          >
            <span>
              {pending
                ? "Enviando…"
                : isOpen
                  ? "Finalizar pedido"
                  : "Pizzaria fechada"}
            </span>
            <span>{money(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ helpers

function buildPaymentOptions(tenant: Tenant) {
  const options: {
    value: PaymentMethod;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [];

  if (tenant.online_payment_enabled) {
    options.push({
      value: "pix_online",
      title: "Pix online",
      subtitle: "Pague agora, confirmação na hora",
      icon: <QrCode className="size-4" />,
    });
    options.push({
      value: "card_online",
      title: "Cartão online",
      subtitle: "Crédito ou débito",
      icon: <CreditCard className="size-4" />,
    });
  }
  if (tenant.accepts_pix_manual) {
    options.push({
      value: "pix_manual",
      title: "Pix na chave",
      subtitle: "Envie o comprovante depois",
      icon: <QrCode className="size-4" />,
    });
  }
  if (tenant.accepts_cash) {
    options.push({
      value: "cash",
      title: "Dinheiro",
      subtitle: "Na entrega",
      icon: <Banknote className="size-4" />,
    });
  }
  if (tenant.accepts_card_delivery) {
    options.push({
      value: "card_delivery",
      title: "Cartão na entrega",
      subtitle: "Maquininha do entregador",
      icon: <CreditCard className="size-4" />,
    });
  }
  return options;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition"
      style={
        selected
          ? {
              borderColor: "var(--brand)",
              background: "color-mix(in srgb, var(--brand) 7%, white)",
            }
          : { borderColor: "var(--line)" }
      }
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full"
        style={
          selected
            ? { background: "var(--brand)", color: "var(--brand-ink)" }
            : { background: "var(--background)" }
        }
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className="block truncate text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  inputMode,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputMode?: "tel" | "decimal" | "numeric";
  optional?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-stone-500">
        {label}
        {optional && <span className="font-normal text-muted"> (opcional)</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-stone-400"
      />
    </label>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-bold" : ""}>{value}</dd>
    </div>
  );
}
