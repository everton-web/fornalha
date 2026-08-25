export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod =
  | "cash"
  | "card_delivery"
  | "pix_manual"
  | "pix_online"
  | "card_online";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type DeliveryType = "delivery" | "pickup";
export type ProductKind = "pizza" | "simple";

export type OpeningHour = { day: number; open: string; close: string };

/** Estrutura aceita numa coluna jsonb — evita cast na hora de gravar. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  /** true quando existe imagem enviada pelo painel (servida por /api/logo/{slug}) */
  has_logo: boolean;
  cover_url: string | null;
  primary_color: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  is_active: boolean;
  is_open_override: boolean | null;
  opening_hours: OpeningHour[];
  timezone: string;
  prep_time_min: number;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  delivery_fee: number;
  min_order_value: number;
  accepts_cash: boolean;
  accepts_card_delivery: boolean;
  accepts_pix_manual: boolean;
  pix_key: string | null;
  online_payment_enabled: boolean;
  payment_provider: string | null;
  half_pricing: "max" | "avg";
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type Size = {
  id: string;
  name: string;
  slices: number | null;
  max_flavors: number;
  sort_order: number;
};

export type Flavor = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  is_sweet: boolean;
  sort_order: number;
  /** preço por tamanho: { [size_id]: price } */
  prices: Record<string, number>;
};

export type Crust = { id: string; name: string; price: number };
export type Addon = { id: string; name: string; price: number };

export type Product = {
  id: string;
  category_id: string | null;
  kind: ProductKind;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  sort_order: number;
};

/** Tudo que a vitrine da pizzaria precisa, em uma viagem só ao banco. */
export type Menu = {
  tenant: Tenant;
  categories: Category[];
  sizes: Size[];
  flavors: Flavor[];
  crusts: Crust[];
  addons: Addon[];
  products: Product[];
};

// ------------------------------------------------------------------ carrinho
/** O carrinho guarda IDs, nunca preços: o servidor recalcula tudo no checkout. */
export type CartPizza = {
  uid: string;
  kind: "pizza";
  sizeId: string;
  flavorIds: string[];
  crustId: string | null;
  addonIds: string[];
  quantity: number;
  notes?: string;
};

export type CartProduct = {
  uid: string;
  kind: "simple";
  productId: string;
  quantity: number;
  notes?: string;
};

export type CartItem = CartPizza | CartProduct;

/** Item já precificado, pronto para exibir ou gravar. */
export type PricedItem = {
  uid: string;
  kind: ProductKind;
  title: string;
  subtitle: string;
  details: JsonObject;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
};

export type OrderSummary = {
  items: PricedItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};
