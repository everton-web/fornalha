import { ImageResponse } from "next/og";

import { requireSession } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { buildReceipt, estimateHeight } from "@/lib/receipt";

/**
 * Cupom em PNG, na largura nativa da impressora térmica de 80mm (576 pontos).
 *
 * É o caminho para imprimir a partir do celular: a imagem cai no WhatsApp,
 * o dono compartilha para o app da impressora e sai no papel — sem depender
 * da internet da loja, só do 4G do aparelho.
 */

const LARGURA = 576;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  const { id } = await params;

  const order = await getOrderById(session.tenant.id, id);
  if (!order) return new Response("Pedido não encontrado", { status: 404 });

  const r = buildReceipt(order, session.tenant);

  const linha = { display: "flex", justifyContent: "space-between", width: "100%" };
  const divisor = {
    display: "flex",
    width: "100%",
    height: 2,
    background: "#000",
    marginTop: 10,
    marginBottom: 10,
  };

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: LARGURA,
          background: "#fff",
          color: "#000",
          padding: "24px 20px",
          fontSize: 22,
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "100%", fontSize: 32, fontWeight: 700 }}>
          {r.storeName}
        </div>
        {r.storeInfo.map((info) => (
          <div key={info} style={{ display: "flex", justifyContent: "center", width: "100%", fontSize: 18 }}>
            {info}
          </div>
        ))}

        <div style={divisor} />

        {r.cancelled && (
          <div style={{ display: "flex", justifyContent: "center", width: "100%", fontSize: 34, fontWeight: 700 }}>
            ** CANCELADO **
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", width: "100%", fontSize: 44, fontWeight: 700 }}>
          #{r.code}
        </div>
        <div style={{ display: "flex", justifyContent: "center", width: "100%", fontSize: 20 }}>
          {r.placedAt}
        </div>
        <div style={{ display: "flex", justifyContent: "center", width: "100%", fontSize: 26, fontWeight: 700 }}>
          {r.mode}
        </div>

        <div style={divisor} />

        <div style={{ display: "flex", fontWeight: 700 }}>{r.customerName}</div>
        <div style={{ display: "flex" }}>{r.customerPhone}</div>
        {r.addressLines.map((l) => (
          <div key={l} style={{ display: "flex", fontSize: 19 }}>
            {l}
          </div>
        ))}

        <div style={divisor} />

        {r.items.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", width: "100%", marginBottom: 8 }}>
            <div style={linha}>
              <div style={{ display: "flex", fontWeight: 700, maxWidth: 380 }}>
                {item.quantity}x {item.title}
              </div>
              <div style={{ display: "flex", fontWeight: 700 }}>{item.price}</div>
            </div>
            {item.extras && (
              <div style={{ display: "flex", fontSize: 18, paddingLeft: 22 }}>{item.extras}</div>
            )}
            {item.note && (
              <div style={{ display: "flex", fontSize: 19, fontWeight: 700, paddingLeft: 22 }}>
                ** {item.note}
              </div>
            )}
          </div>
        ))}

        <div style={divisor} />

        {r.totals.map((t) => (
          <div key={t.label} style={{ ...linha, fontSize: t.strong ? 30 : 22, fontWeight: t.strong ? 700 : 500 }}>
            <div style={{ display: "flex" }}>{t.label}</div>
            <div style={{ display: "flex" }}>{t.value}</div>
          </div>
        ))}

        <div style={divisor} />

        <div style={{ display: "flex" }}>{r.payment}</div>

        {r.notes && (
          // Fragmento aqui quebra o layout do Satori: cada filho do container
          // flex precisa ser um elemento com display definido.
          <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div style={divisor} />
            <div style={{ display: "flex", fontWeight: 700 }}>OBS: {r.notes}</div>
          </div>
        )}
      </div>
    ),
    {
      width: LARGURA,
      height: estimateHeight(r),
      headers: {
        // Cupom de pedido não muda: pode ficar em cache no aparelho.
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="pedido-${r.code}.png"`,
      },
    },
  );
}
