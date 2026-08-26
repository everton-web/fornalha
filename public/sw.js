/**
 * Service worker do painel.
 *
 * Existe por um motivo só: receber notificação com o navegador fechado. Não
 * faz cache de página nem tenta funcionar offline — o painel precisa de dados
 * atuais, e servir pedido velho de cache seria pior que não abrir.
 */

self.addEventListener("install", (event) => {
  // Assume o controle sem esperar as abas antigas fecharem.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = {};
  }

  const titulo = dados.title || "Pedido novo";
  const opcoes = {
    body: dados.body || "",
    icon: dados.icon || "/api/icone/192",
    badge: "/api/icone/96?badge=1",
    tag: dados.tag || "pedido",
    // Sem isso, notificações seguidas substituem umas às outras em silêncio.
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: dados.url || "/admin/pedidos" },
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || "/admin/pedidos";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((janelas) => {
        // Se o painel já está aberto em alguma aba, foca nela em vez de abrir outra.
        for (const janela of janelas) {
          if (janela.url.includes("/admin") && "focus" in janela) {
            janela.navigate(destino);
            return janela.focus();
          }
        }
        return self.clients.openWindow(destino);
      }),
  );
});
