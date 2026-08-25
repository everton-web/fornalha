import type { OpeningHour, Tenant } from "@/lib/types";

const DAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function dayName(day: number): string {
  return DAYS[day] ?? "";
}

/** Hora local do fuso da pizzaria, em minutos desde a meia-noite + dia da semana. */
function localNow(timeZone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const hour = Number(get("hour")) % 24;
  return {
    day: weekdayMap[get("weekday")] ?? 0,
    minutes: hour * 60 + Number(get("minute")),
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * A pizzaria está aberta agora?
 *
 * Trata a virada do dia: um turno 18:00–00:30 continua valendo às 00:10
 * do dia seguinte, que é exatamente quando o pedido de pizza costuma cair.
 */
export function isOpenNow(tenant: Tenant, at = new Date()): boolean {
  if (tenant.is_open_override !== null) return tenant.is_open_override;

  const hours = tenant.opening_hours ?? [];
  if (hours.length === 0) return false;

  const { day, minutes } = localNow(tenant.timezone, at);

  return hours.some((h: OpeningHour) => {
    const open = toMinutes(h.open);
    const close = toMinutes(h.close);

    if (close > open) {
      return h.day === day && minutes >= open && minutes < close;
    }
    // turno que cruza a meia-noite
    const yesterday = (day + 6) % 7;
    return (
      (h.day === day && minutes >= open) ||
      (h.day === yesterday && minutes < close)
    );
  });
}

/** "Hoje das 18:00 às 23:30" para o próximo turno, ou null se não houver. */
export function nextOpening(tenant: Tenant, at = new Date()): string | null {
  const hours = tenant.opening_hours ?? [];
  if (hours.length === 0) return null;

  const { day, minutes } = localNow(tenant.timezone, at);

  for (let offset = 0; offset < 7; offset++) {
    const target = (day + offset) % 7;
    const shifts = hours
      .filter((h) => h.day === target)
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open));

    for (const shift of shifts) {
      if (offset === 0 && toMinutes(shift.open) <= minutes) continue;
      const when =
        offset === 0 ? "hoje" : offset === 1 ? "amanhã" : dayName(target).toLowerCase();
      return `Abre ${when} às ${shift.open}`;
    }
  }
  return null;
}

/** Agrupa os turnos por dia para exibir na página. */
export function groupHours(hours: OpeningHour[]) {
  return DAYS.map((name, day) => ({
    day,
    name,
    shifts: hours
      .filter((h) => h.day === day)
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open)),
  }));
}
