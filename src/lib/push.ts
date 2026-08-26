import "server-only";

import webpush from "web-push";

import { sql } from "@/lib/db";

/**
 * Notificação push para os aparelhos da pizzaria.
 *
 * É o único aviso que alcança quem fechou o navegador — o alerta sonoro e o
 * título da aba só existem com a tela aberta. Numa pizzaria, isso é a
 * diferença entre ver o pedido na hora e ver meia hora depois.
 */

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;

  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contato@fornalha.app",
    publica,
    privada,
  );
  configurado = true;
  return true;
}

export function pushDisponivel(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

/**
 * Dispara para todos os aparelhos inscritos da pizzaria.
 *
 * Aparelho que responde 404 ou 410 desinstalou o app ou revogou a permissão:
 * a assinatura é apagada em vez de ficar falhando para sempre.
 */
export async function notifyTenant(
  tenantId: string,
  payload: PushPayload,
): Promise<{ enviados: number; removidos: number }> {
  if (!configurar()) return { enviados: 0, removidos: 0 };

  const inscritos = await sql`
    select endpoint, p256dh, auth from push_subscriptions
    where tenant_id = ${tenantId}
  `;

  let enviados = 0;
  const mortos: string[] = [];

  await Promise.all(
    inscritos.map(async (i) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: i.endpoint as string,
            keys: { p256dh: i.p256dh as string, auth: i.auth as string },
          },
          JSON.stringify(payload),
          { TTL: 3600, urgency: "high" },
        );
        enviados += 1;
      } catch (erro) {
        const status = (erro as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          mortos.push(i.endpoint as string);
        } else {
          console.error("Falha ao enviar push", status, erro);
        }
      }
    }),
  );

  if (mortos.length > 0) {
    await sql`delete from push_subscriptions where endpoint in ${sql(mortos)}`;
  }

  if (enviados > 0) {
    await sql`
      update push_subscriptions set last_sent_at = now() where tenant_id = ${tenantId}
    `;
  }

  return { enviados, removidos: mortos.length };
}
