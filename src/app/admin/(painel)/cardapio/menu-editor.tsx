"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

import type {
  AdminFlavor,
  AdminMenu,
  AdminPriceGroup,
  AdminProduct,
  AdminSimple,
  AdminSize,
} from "@/lib/admin-menu";

import {
  deleteItem,
  saveCategory,
  saveFlavor,
  savePriceGroup,
  saveProduct,
  saveSimpleItem,
  saveSize,
  setItemActive,
} from "../../menu-actions";
import { FotoField } from "./foto-field";

type Tab =
  | "sabores"
  | "faixas"
  | "tamanhos"
  | "bordas"
  | "adicionais"
  | "bebidas"
  | "categorias";

const TABS: { id: Tab; label: string }[] = [
  { id: "sabores", label: "Sabores" },
  { id: "faixas", label: "Faixas de preço" },
  { id: "tamanhos", label: "Tamanhos" },
  { id: "bordas", label: "Bordas" },
  { id: "adicionais", label: "Adicionais" },
  { id: "bebidas", label: "Bebidas e extras" },
  { id: "categorias", label: "Categorias" },
];

export function MenuEditor({ menu }: { menu: AdminMenu }) {
  const [tab, setTab] = useState<Tab>("sabores");

  return (
    <>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "border-foreground bg-foreground text-white"
                : "border-line bg-surface hover:border-stone-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sabores" && <FlavorsSection menu={menu} />}
      {tab === "faixas" && <PriceGroupsSection menu={menu} />}
      {tab === "tamanhos" && <SizesSection sizes={menu.sizes} />}
      {tab === "bordas" && <SimpleSection table="crusts" items={menu.crusts} label="borda" />}
      {tab === "adicionais" && (
        <SimpleSection table="addons" items={menu.addons} label="adicional" />
      )}
      {tab === "bebidas" && <ProductsSection menu={menu} />}
      {tab === "categorias" && <CategoriesSection menu={menu} />}
    </>
  );
}

// ------------------------------------------------------------------ sabores

function FlavorsSection({ menu }: { menu: AdminMenu }) {
  const [creating, setCreating] = useState(false);

  if (menu.sizes.length === 0) {
    return (
      <Empty>
        Cadastre pelo menos um tamanho antes de criar sabores — o preço de cada
        sabor depende do tamanho.
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {menu.flavors.map((flavor) => (
        <FlavorRow key={flavor.id} flavor={flavor} menu={menu} />
      ))}

      {creating ? (
        <FlavorRow
          menu={menu}
          flavor={{
            id: "",
            name: "",
            description: "",
            category_id: null,
            price_group_id: menu.priceGroups[0]?.id ?? null,
            is_sweet: false,
            is_active: true,
            has_image: false,
            prices: {},
          }}
          onDone={() => setCreating(false)}
        />
      ) : (
        <AddButton onClick={() => setCreating(true)}>Novo sabor</AddButton>
      )}
    </div>
  );
}

function FlavorRow({
  flavor,
  menu,
  onDone,
}: {
  flavor: AdminFlavor;
  menu: AdminMenu;
  onDone?: () => void;
}) {
  const router = useRouter();
  const isNew = !flavor.id;
  const [name, setName] = useState(flavor.name);
  const [description, setDescription] = useState(flavor.description ?? "");
  const [categoryId, setCategoryId] = useState(flavor.category_id ?? "");
  const [groupId, setGroupId] = useState(flavor.price_group_id ?? "");
  const [isSweet, setIsSweet] = useState(flavor.is_sweet);
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      menu.sizes.map((s) => [s.id, flavor.prices[s.id]?.toString() ?? ""]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grupo = menu.priceGroups.find((g) => g.id === groupId) ?? null;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveFlavor({
        id: flavor.id || undefined,
        name,
        description,
        categoryId: categoryId || null,
        priceGroupId: groupId || null,
        isSweet,
        isActive: flavor.is_active,
        prices: Object.fromEntries(
          Object.entries(prices).map(([sizeId, value]) => [
            sizeId,
            value.trim() === "" ? null : Number(value.replace(",", ".")),
          ]),
        ),
      });
      if (!result.ok) return setError(result.error);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <Row inactive={!flavor.is_active && !isNew}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nome" value={name} onChange={setName} placeholder="Calabresa" />
        <Input
          label="Descrição"
          value={description}
          onChange={setDescription}
          placeholder="Calabresa fatiada, cebola, azeitona"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Faixa de preço
          </span>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none"
          >
            <option value="">Preço próprio (sem faixa)</option>
            {menu.priceGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.is_active ? "" : " (pausada)"}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Categoria
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none"
          >
            <option value="">Sem categoria</option>
            {menu.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {menu.sizes.map((size) => {
          const daFaixa = grupo?.prices[size.id];
          return (
            <label key={size.id} className="w-24">
              <span className="mb-1 block text-xs font-medium text-stone-500">
                {size.name}
              </span>
              <input
                value={prices[size.id] ?? ""}
                onChange={(e) =>
                  setPrices((prev) => ({ ...prev, [size.id]: e.target.value }))
                }
                inputMode="decimal"
                // Com faixa, o campo em branco não é "sem preço": é o preço da
                // faixa. Mostrá-lo como sugestão evita que alguém o redigite e
                // crie sem querer uma exceção que nunca mais acompanha a tabela.
                placeholder={daFaixa != null ? daFaixa.toFixed(2) : "—"}
                className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none focus:border-stone-400"
              />
            </label>
          );
        })}

        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={isSweet}
            onChange={(e) => setIsSweet(e.target.checked)}
            className="size-4"
          />
          Doce
        </label>
      </div>

      {grupo && (
        <p className="mt-2 text-xs text-muted">
          Em branco, vale o preço da faixa <strong>{grupo.name}</strong>.
          Preencher um tamanho cria uma exceção só para este sabor.
        </p>
      )}

      <div className="mt-3">
        <span className="mb-1.5 block text-xs font-medium text-stone-500">
          Foto
        </span>
        <FotoField
          tipo="sabor"
          id={flavor.id || null}
          hasImage={flavor.has_image}
          nome={name || "sabor"}
        />
      </div>

      <RowFooter
        error={error}
        pending={pending}
        onSave={save}
        isNew={isNew}
        isActive={flavor.is_active}
        onToggleActive={() =>
          startTransition(async () => {
            await setItemActive("flavors", flavor.id, !flavor.is_active);
            router.refresh();
          })
        }
        onDelete={() =>
          startTransition(async () => {
            await deleteItem("flavors", flavor.id);
            router.refresh();
          })
        }
        onCancel={onDone}
      />
    </Row>
  );
}

// ------------------------------------------------------------ faixas de preço

function PriceGroupsSection({ menu }: { menu: AdminMenu }) {
  const [creating, setCreating] = useState(false);

  if (menu.sizes.length === 0) {
    return (
      <Empty>
        Cadastre pelo menos um tamanho antes de criar faixas — a faixa guarda um
        preço para cada tamanho.
      </Empty>
    );
  }

  const emUso = new Map<string, number>();
  for (const f of menu.flavors) {
    if (f.price_group_id) {
      emUso.set(f.price_group_id, (emUso.get(f.price_group_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-3">
      <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        Em vez de digitar o preço sabor por sabor, junte os sabores em faixas —
        Tradicionais, Especiais, Premium — e mexa no preço de todos de uma vez.
        Um sabor sempre pode ter preço próprio como exceção.
      </p>

      {menu.priceGroups.map((grupo) => (
        <PriceGroupRow
          key={grupo.id}
          grupo={grupo}
          sizes={menu.sizes}
          sabores={emUso.get(grupo.id) ?? 0}
        />
      ))}

      {creating ? (
        <PriceGroupRow
          grupo={{ id: "", name: "", is_active: true, prices: {} }}
          sizes={menu.sizes}
          sabores={0}
          onDone={() => setCreating(false)}
        />
      ) : (
        <AddButton onClick={() => setCreating(true)}>Nova faixa</AddButton>
      )}
    </div>
  );
}

function PriceGroupRow({
  grupo,
  sizes,
  sabores,
  onDone,
}: {
  grupo: AdminPriceGroup;
  sizes: AdminSize[];
  sabores: number;
  onDone?: () => void;
}) {
  const router = useRouter();
  const isNew = !grupo.id;
  const [name, setName] = useState(grupo.name);
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sizes.map((s) => [s.id, grupo.prices[s.id]?.toString() ?? ""]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await savePriceGroup({
        id: grupo.id || undefined,
        name,
        isActive: grupo.is_active,
        prices: Object.fromEntries(
          Object.entries(prices).map(([sizeId, value]) => [
            sizeId,
            value.trim() === "" ? null : Number(value.replace(",", ".")),
          ]),
        ),
      });
      if (!result.ok) return setError(result.error);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <Row inactive={!grupo.is_active && !isNew}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-40 flex-1">
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Nome da faixa
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Especiais"
            className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none focus:border-stone-400"
          />
        </label>

        {sizes.map((size) => (
          <label key={size.id} className="w-24">
            <span className="mb-1 block text-xs font-medium text-stone-500">
              {size.name}
            </span>
            <input
              value={prices[size.id] ?? ""}
              onChange={(e) =>
                setPrices((prev) => ({ ...prev, [size.id]: e.target.value }))
              }
              inputMode="decimal"
              placeholder="—"
              className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none focus:border-stone-400"
            />
          </label>
        ))}
      </div>

      {!isNew && (
        <p className="mt-2 text-xs text-muted">
          {sabores === 0
            ? "Nenhum sabor nesta faixa ainda."
            : `${sabores} sabor${sabores > 1 ? "es" : ""} nesta faixa — mudar o preço aqui muda o de todos.`}
        </p>
      )}

      <RowFooter
        error={error}
        pending={pending}
        onSave={save}
        isNew={isNew}
        isActive={grupo.is_active}
        onToggleActive={() =>
          startTransition(async () => {
            await setItemActive("price_groups", grupo.id, !grupo.is_active);
            router.refresh();
          })
        }
        onDelete={() =>
          startTransition(async () => {
            await deleteItem("price_groups", grupo.id);
            router.refresh();
          })
        }
        onCancel={onDone}
      />
    </Row>
  );
}

// ----------------------------------------------------------------- tamanhos

function SizesSection({ sizes }: { sizes: AdminSize[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      {sizes.map((size) => (
        <SizeRow key={size.id} size={size} />
      ))}
      {creating ? (
        <SizeRow
          size={{ id: "", name: "", slices: null, max_flavors: 2, is_active: true }}
          onDone={() => setCreating(false)}
        />
      ) : (
        <AddButton onClick={() => setCreating(true)}>Novo tamanho</AddButton>
      )}
    </div>
  );
}

function SizeRow({ size, onDone }: { size: AdminSize; onDone?: () => void }) {
  const router = useRouter();
  const isNew = !size.id;
  const [name, setName] = useState(size.name);
  const [slices, setSlices] = useState(size.slices?.toString() ?? "");
  const [maxFlavors, setMaxFlavors] = useState(size.max_flavors.toString());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveSize({
        id: size.id || undefined,
        name,
        slices: slices.trim() === "" ? null : Number(slices),
        maxFlavors: Number(maxFlavors),
        isActive: size.is_active,
      });
      if (!result.ok) return setError(result.error);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <Row inactive={!size.is_active && !isNew}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Nome" value={name} onChange={setName} placeholder="Grande" />
        <Input
          label="Fatias"
          value={slices}
          onChange={setSlices}
          placeholder="8"
          inputMode="numeric"
        />
        <Input
          label="Máx. de sabores"
          value={maxFlavors}
          onChange={setMaxFlavors}
          placeholder="2"
          inputMode="numeric"
        />
      </div>

      <RowFooter
        error={error}
        pending={pending}
        onSave={save}
        isNew={isNew}
        isActive={size.is_active}
        onToggleActive={() =>
          startTransition(async () => {
            await setItemActive("sizes", size.id, !size.is_active);
            router.refresh();
          })
        }
        onDelete={() =>
          startTransition(async () => {
            await deleteItem("sizes", size.id);
            router.refresh();
          })
        }
        onCancel={onDone}
      />
    </Row>
  );
}

// ------------------------------------------------------- bordas / adicionais

function SimpleSection({
  table,
  items,
  label,
}: {
  table: "crusts" | "addons";
  items: AdminSimple[];
  label: string;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SimpleRow key={item.id} table={table} item={item} />
      ))}
      {creating ? (
        <SimpleRow
          table={table}
          item={{ id: "", name: "", price: 0, is_active: true }}
          onDone={() => setCreating(false)}
        />
      ) : (
        <AddButton onClick={() => setCreating(true)}>Nova {label}</AddButton>
      )}
    </div>
  );
}

function SimpleRow({
  table,
  item,
  onDone,
}: {
  table: "crusts" | "addons";
  item: AdminSimple;
  onDone?: () => void;
}) {
  const router = useRouter();
  const isNew = !item.id;
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price.toString());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveSimpleItem({
        table,
        id: item.id || undefined,
        name,
        price: Number(price.replace(",", ".")),
        isActive: item.is_active,
      });
      if (!result.ok) return setError(result.error);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <Row inactive={!item.is_active && !isNew}>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Input label="Nome" value={name} onChange={setName} placeholder="Catupiry" />
        <Input
          label="Preço"
          value={price}
          onChange={setPrice}
          placeholder="9,00"
          inputMode="decimal"
        />
      </div>

      <RowFooter
        error={error}
        pending={pending}
        onSave={save}
        isNew={isNew}
        isActive={item.is_active}
        onToggleActive={() =>
          startTransition(async () => {
            await setItemActive(table, item.id, !item.is_active);
            router.refresh();
          })
        }
        onDelete={() =>
          startTransition(async () => {
            await deleteItem(table, item.id);
            router.refresh();
          })
        }
        onCancel={onDone}
      />
    </Row>
  );
}

// ------------------------------------------------------------------ produtos

function ProductsSection({ menu }: { menu: AdminMenu }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      {menu.products.map((product) => (
        <ProductRow key={product.id} product={product} menu={menu} />
      ))}
      {creating ? (
        <ProductRow
          menu={menu}
          product={{
            id: "",
            name: "",
            description: "",
            price: 0,
            category_id: null,
            is_active: true,
            has_image: false,
          }}
          onDone={() => setCreating(false)}
        />
      ) : (
        <AddButton onClick={() => setCreating(true)}>Novo item</AddButton>
      )}
    </div>
  );
}

function ProductRow({
  product,
  menu,
  onDone,
}: {
  product: AdminProduct;
  menu: AdminMenu;
  onDone?: () => void;
}) {
  const router = useRouter();
  const isNew = !product.id;
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(product.price.toString());
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveProduct({
        id: product.id || undefined,
        name,
        description,
        price: Number(price.replace(",", ".")),
        categoryId: categoryId || null,
        isActive: product.is_active,
      });
      if (!result.ok) return setError(result.error);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <Row inactive={!product.is_active && !isNew}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nome" value={name} onChange={setName} placeholder="Coca-Cola 2L" />
        <Input
          label="Descrição"
          value={description}
          onChange={setDescription}
          placeholder="Garrafa gelada"
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Input
          label="Preço"
          value={price}
          onChange={setPrice}
          placeholder="14,00"
          inputMode="decimal"
        />
        <label>
          <span className="mb-1 block text-xs font-medium text-stone-500">
            Categoria
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none"
          >
            <option value="">Sem categoria</option>
            {menu.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block text-xs font-medium text-stone-500">
          Foto
        </span>
        <FotoField
          tipo="produto"
          id={product.id || null}
          hasImage={product.has_image}
          nome={name || "item"}
        />
      </div>

      <RowFooter
        error={error}
        pending={pending}
        onSave={save}
        isNew={isNew}
        isActive={product.is_active}
        onToggleActive={() =>
          startTransition(async () => {
            await setItemActive("products", product.id, !product.is_active);
            router.refresh();
          })
        }
        onDelete={() =>
          startTransition(async () => {
            await deleteItem("products", product.id);
            router.refresh();
          })
        }
        onCancel={onDone}
      />
    </Row>
  );
}

// ---------------------------------------------------------------- categorias

function CategoriesSection({ menu }: { menu: AdminMenu }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {menu.categories.map((category) => (
        <Row key={category.id} inactive={!category.is_active}>
          <div className="flex items-center gap-3">
            <span className="flex-1 font-medium">{category.name}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setItemActive("categories", category.id, !category.is_active);
                  router.refresh();
                })
              }
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium transition hover:border-stone-300"
            >
              {category.is_active ? "Ocultar" : "Mostrar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteItem("categories", category.id);
                  router.refresh();
                })
              }
              className="grid size-8 place-items-center rounded-full border border-line text-muted transition hover:border-red-300 hover:text-red-600"
              aria-label="Excluir categoria"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </Row>
      ))}

      <Row>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="Nova categoria"
              value={name}
              onChange={setName}
              placeholder="Pizzas doces"
            />
          </div>
          <button
            type="button"
            disabled={pending || name.trim().length < 2}
            onClick={() =>
              startTransition(async () => {
                await saveCategory({ name });
                setName("");
                router.refresh();
              })
            }
            className="rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      </Row>
    </div>
  );
}

// -------------------------------------------------------------------- peças

function Row({
  inactive,
  children,
}: {
  inactive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-4 ${inactive ? "opacity-55" : ""}`}
    >
      {children}
    </div>
  );
}

function RowFooter({
  error,
  pending,
  onSave,
  onDelete,
  onToggleActive,
  onCancel,
  isNew,
  isActive,
}: {
  error: string | null;
  pending: boolean;
  onSave: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onCancel?: () => void;
  isNew: boolean;
  isActive: boolean;
}) {
  return (
    <>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          <Check className="size-3.5" />
          {isNew ? "Criar" : "Salvar"}
        </button>

        {isNew ? (
          onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-muted"
            >
              Cancelar
            </button>
          )
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={onToggleActive}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium transition hover:border-stone-300"
            >
              {isActive ? "Ocultar do cardápio" : "Mostrar no cardápio"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="ml-auto grid size-8 place-items-center rounded-full border border-line text-muted transition hover:border-red-300 hover:text-red-600"
              aria-label="Excluir"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="block">
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

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface px-4 py-4 text-sm font-medium text-muted transition hover:border-stone-300 hover:text-foreground"
    >
      <Plus className="size-4" />
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
