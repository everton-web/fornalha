"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Plus, Trash2 } from "lucide-react";

import { dayName } from "@/lib/hours";
import type { OpeningHour, Tenant } from "@/lib/types";

import { updateSettings } from "../../settings-actions";
import { LogoField } from "./logo-field";

export function SettingsForm({
  tenant,
  canEdit,
}: {
  tenant: Tenant;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: tenant.name,
    tagline: tenant.tagline ?? "",
    primaryColor: tenant.primary_color,
    phone: tenant.phone ?? "",
    whatsapp: tenant.whatsapp ?? "",
    address: tenant.address ?? "",
    logoUrl: tenant.logo_url ?? "",
    prepTimeMin: String(tenant.prep_time_min),
    deliveryEnabled: tenant.delivery_enabled,
    pickupEnabled: tenant.pickup_enabled,
    deliveryFee: String(tenant.delivery_fee),
    minOrderValue: String(tenant.min_order_value),
    acceptsCash: tenant.accepts_cash,
    acceptsCardDelivery: tenant.accepts_card_delivery,
    acceptsPixManual: tenant.accepts_pix_manual,
    pixKey: tenant.pix_key ?? "",
    halfPricing: tenant.half_pricing,
  });
  const [hours, setHours] = useState<OpeningHour[]>(tenant.opening_hours ?? []);
  const [message, setMessage] = useState<
    { type: "ok" | "error"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateSettings({
        ...form,
        prepTimeMin: Number(form.prepTimeMin),
        deliveryFee: Number(form.deliveryFee.replace(",", ".")),
        minOrderValue: Number(form.minOrderValue.replace(",", ".")),
        openingHours: hours,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "ok", text: "Configurações salvas." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 pb-24">
      {!canEdit && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Seu acesso é de equipe: você vê as configurações, mas só o dono pode
          alterá-las.
        </p>
      )}

      <Card title="Identidade">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" value={form.name} onChange={(v) => set("name", v)} />
          <Field
            label="Frase de efeito"
            value={form.tagline}
            onChange={(v) => set("tagline", v)}
            placeholder="Forno a lenha desde 1998"
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">
              Cor da marca
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => set("primaryColor", e.target.value)}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-line bg-surface"
              />
              <input
                value={form.primaryColor}
                onChange={(e) => set("primaryColor", e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-2.5 py-2 font-mono text-sm outline-none"
              />
            </div>
          </label>
          <LogoField
            tenant={tenant}
            urlValue={form.logoUrl}
            onUrlChange={(v) => set("logoUrl", v)}
            canEdit={canEdit}
          />
          <Field
            label="Telefone"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            placeholder="(11) 3456-7890"
          />
          <Field
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(v) => set("whatsapp", v)}
            placeholder="11987654321"
          />
          <Field
            className="sm:col-span-2"
            label="Endereço"
            value={form.address}
            onChange={(v) => set("address", v)}
          />
        </div>
      </Card>

      <Card title="Operação">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Tempo de preparo (min)"
            value={form.prepTimeMin}
            onChange={(v) => set("prepTimeMin", v)}
            inputMode="numeric"
          />
          <Field
            label="Taxa de entrega (R$)"
            value={form.deliveryFee}
            onChange={(v) => set("deliveryFee", v)}
            inputMode="decimal"
          />
          <Field
            label="Pedido mínimo (R$)"
            value={form.minOrderValue}
            onChange={(v) => set("minOrderValue", v)}
            inputMode="decimal"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <Toggle
            label="Aceita entrega"
            checked={form.deliveryEnabled}
            onChange={(v) => set("deliveryEnabled", v)}
          />
          <Toggle
            label="Aceita retirada"
            checked={form.pickupEnabled}
            onChange={(v) => set("pickupEnabled", v)}
          />
        </div>

        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Preço da pizza com mais de um sabor
          </span>
          <select
            value={form.halfPricing}
            onChange={(e) => set("halfPricing", e.target.value as "max" | "avg")}
            className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none"
          >
            <option value="max">Cobrar o sabor mais caro</option>
            <option value="avg">Cobrar a média dos sabores</option>
          </select>
        </label>
      </Card>

      <Card title="Pagamento">
        <div className="flex flex-wrap gap-4">
          <Toggle
            label="Dinheiro"
            checked={form.acceptsCash}
            onChange={(v) => set("acceptsCash", v)}
          />
          <Toggle
            label="Cartão na entrega"
            checked={form.acceptsCardDelivery}
            onChange={(v) => set("acceptsCardDelivery", v)}
          />
          <Toggle
            label="Pix na chave"
            checked={form.acceptsPixManual}
            onChange={(v) => set("acceptsPixManual", v)}
          />
        </div>

        {form.acceptsPixManual && (
          <div className="mt-4 max-w-md">
            <Field
              label="Chave Pix"
              value={form.pixKey}
              onChange={(v) => set("pixKey", v)}
              placeholder="e-mail, CPF/CNPJ ou telefone"
            />
          </div>
        )}

        <p className="mt-4 rounded-xl bg-background px-3 py-2.5 text-xs text-muted">
          Pagamento online (Pix e cartão com confirmação automática) precisa da
          conta do gateway conectada. Fale com a agência para ativar.
        </p>
      </Card>

      <Card title="Horários de funcionamento">
        <HoursEditor hours={hours} onChange={setHours} />
      </Card>

      {message && (
        <p
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "ok" ? (
            <Check className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          {message.text}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-6xl px-1">
          <button
            type="button"
            onClick={save}
            disabled={pending || !canEdit}
            className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Salvando…" : "Salvar configurações"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Turnos por dia. Uma pizzaria pode ter dois turnos no mesmo dia. */
function HoursEditor({
  hours,
  onChange,
}: {
  hours: OpeningHour[];
  onChange: (hours: OpeningHour[]) => void;
}) {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const shifts = hours.filter((h) => h.day === day);

        return (
          <div key={day} className="flex flex-wrap items-center gap-2 py-1">
            <span className="w-20 text-sm font-medium">{dayName(day)}</span>

            {shifts.length === 0 && (
              <span className="text-sm text-muted">Fechado</span>
            )}

            {shifts.map((shift, index) => {
              const globalIndex = hours.indexOf(shift);
              return (
                <span key={index} className="flex items-center gap-1">
                  <input
                    type="time"
                    value={shift.open}
                    onChange={(e) => {
                      const next = [...hours];
                      next[globalIndex] = { ...shift, open: e.target.value };
                      onChange(next);
                    }}
                    className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none"
                  />
                  <span className="text-muted">até</span>
                  <input
                    type="time"
                    value={shift.close}
                    onChange={(e) => {
                      const next = [...hours];
                      next[globalIndex] = { ...shift, close: e.target.value };
                      onChange(next);
                    }}
                    className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onChange(hours.filter((_, i) => i !== globalIndex))}
                    className="grid size-7 place-items-center rounded-full text-muted hover:text-red-600"
                    aria-label="Remover turno"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={() =>
                onChange([...hours, { day, open: "18:00", close: "23:00" }])
              }
              className="ml-auto flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-stone-300 hover:text-foreground"
            >
              <Plus className="size-3" />
              turno
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-stone-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none focus:border-stone-400"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4"
      />
      {label}
    </label>
  );
}
