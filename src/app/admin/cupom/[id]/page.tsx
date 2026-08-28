import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { buildReceipt } from "@/lib/receipt";

import { PrintTrigger } from "./print-trigger";

export const metadata = { title: "Cupom do pedido" };

/**
 * Cupom pronto para impressora térmica de 80mm.
 *
 * Exige sessão do painel: o cupom traz telefone e endereço do cliente, então
 * não pode ficar atrás de um link adivinhável como a página de acompanhamento.
 */
export default async function CupomPage({
  params,
  searchParams,
}: PageProps<"/admin/cupom/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const { auto } = await searchParams;

  const order = await getOrderById(session.tenant.id, id);
  if (!order) notFound();

  const receipt = buildReceipt(order, session.tenant);

  return (
    <>
      <style>{`
        /* 80mm de papel, 72mm de área impressa: o resto é a margem da própria
           impressora. Sem isso o cupom sai cortado à direita. */
        @page { size: 80mm auto; margin: 0; }

        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; margin: 0; padding: 0; }
          .cupom { width: 72mm; margin: 0; padding: 0; box-shadow: none; }
        }

        .cupom {
          width: 72mm;
          margin: 0 auto;
          padding: 4mm 0;
          background: #fff;
          color: #000;
          font-family: ui-monospace, "Cascadia Mono", "Courier New", monospace;
          font-size: 12px;
          line-height: 1.45;
        }
        .cupom .rule { border-top: 1px dashed #000; margin: 6px 0; }
        .cupom .center { text-align: center; }
        .cupom .row { display: flex; justify-content: space-between; gap: 8px; }
        .cupom .strong { font-weight: 700; }
        .cupom .big { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
        .cupom .store { font-size: 15px; font-weight: 700; }
        .cupom .small { font-size: 10.5px; }
        .cupom .item { margin-bottom: 5px; }
        .cupom .indent { padding-left: 14px; }
      `}</style>

      {auto === "1" && <PrintTrigger />}

      <div className="no-print mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-4">
        <Link
          href="/admin/pedidos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar aos pedidos
        </Link>

        <div className="ml-auto flex gap-2">
          <a
            href={`/admin/cupom/${order.id}/imagem`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:border-stone-300"
          >
            <Download className="size-4" />
            Imagem para WhatsApp
          </a>
          <PrintTrigger asButton />
        </div>
      </div>

      <div className="cupom">
        <div className="center store">{receipt.storeName}</div>
        {receipt.storeInfo.map((linha) => (
          <div key={linha} className="center small">
            {linha}
          </div>
        ))}

        <div className="rule" />

        {receipt.cancelled && (
          <div className="center big">** CANCELADO **</div>
        )}

        <div className="center big">#{receipt.code}</div>
        <div className="center">{receipt.placedAt}</div>
        <div className="center strong">{receipt.mode}</div>

        <div className="rule" />

        <div className="strong">{receipt.customerName}</div>
        <div>{receipt.customerPhone}</div>
        {receipt.addressLines.map((linha) => (
          <div key={linha} className="small">
            {linha}
          </div>
        ))}

        <div className="rule" />

        {receipt.items.map((item, i) => (
          <div key={i} className="item">
            <div className="row">
              <span className="strong">
                {item.quantity}x {item.title}
              </span>
              <span className="strong">{item.price}</span>
            </div>
            {item.extras && <div className="indent small">{item.extras}</div>}
            {item.note && (
              <div className="indent small strong">** {item.note}</div>
            )}
          </div>
        ))}

        <div className="rule" />

        {receipt.totals.map((total) => (
          <div
            key={total.label}
            className={`row ${total.strong ? "strong big" : ""}`}
            style={total.strong ? { fontSize: 15 } : undefined}
          >
            <span>{total.label}</span>
            <span>{total.value}</span>
          </div>
        ))}

        <div className="rule" />

        <div>{receipt.payment}</div>

        {receipt.notes && (
          <>
            <div className="rule" />
            <div className="strong">OBS: {receipt.notes}</div>
          </>
        )}

        <div className="rule" />
        <div className="center small">Fornalha</div>
      </div>
    </>
  );
}
