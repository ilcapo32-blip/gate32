// Analítica mínima y respetuosa: eventos con propiedades técnicas agregadas.
// Nunca se envía contenido del usuario (ni audio, ni texto transcrito).
//
// Vía Vercel Web Analytics si está activado en el proyecto (si no, el script
// es un no-op y los eventos solo quedan en el contador local de depuración).

type Props = Record<string, string | number | boolean>;

interface VaWindow extends Window {
  va?: (command: "event", payload: { name: string; data?: Props }) => void;
  goatcounter?: { count(opts: { path: string; title?: string; event: boolean }): void };
}

// Los eventos personalizados de Vercel Web Analytics requieren plan Pro; en
// el plan Hobby solo se registran visitas. GoatCounter (gratuito, sin
// cookies) cubre los eventos del embudo: al crear la cuenta, poner aquí el
// código del sitio (p. ej. "gate32") y redesplegar.
const GOATCOUNTER_CODE = "";

export function initAnalytics(): void {
  if (!GOATCOUNTER_CODE) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset["goatcounter"] = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  document.head.appendChild(s);
}

const COUNTS_KEY = "g32:event-counts";

export function track(name: string, data?: Props): void {
  try {
    (window as VaWindow).va?.("event", data ? { name, data } : { name });
  } catch {
    /* la analítica jamás debe romper la app */
  }
  try {
    // en GoatCounter los eventos son rutas: quedan agrupados por nombre
    (window as VaWindow).goatcounter?.count({ path: name, title: name, event: true });
  } catch {
    /* ídem */
  }
  try {
    const raw = localStorage.getItem(COUNTS_KEY);
    const counts: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    counts[name] = (counts[name] ?? 0) + 1;
    localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
  } catch {
    /* localStorage lleno o bloqueado: irrelevante */
  }
  if (import.meta.env.DEV) console.debug("[track]", name, data ?? {});
}

const FIRST_KEY = "g32:first-visit";
const LAST_KEY = "g32:last-visit";

/** Detecta visitas de retorno (>24 h) para la métrica de retención. */
export function trackVisit(): void {
  try {
    const now = Date.now();
    const first = Number(localStorage.getItem(FIRST_KEY) ?? "0");
    const last = Number(localStorage.getItem(LAST_KEY) ?? "0");
    if (!first) {
      localStorage.setItem(FIRST_KEY, String(now));
    } else if (now - last > 24 * 3600 * 1000) {
      track("return_visit", {
        days_since_first: Math.round((now - first) / (24 * 3600 * 1000)),
      });
    }
    localStorage.setItem(LAST_KEY, String(now));
  } catch {
    /* sin storage no hay métrica de retorno; no pasa nada */
  }
}
