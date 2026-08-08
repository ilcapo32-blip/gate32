// Persistencia del modelo en el navegador.
//
// El modelo se guarda en la caché del navegador tras la primera descarga, y de
// eso depende toda la promesa de "la próxima vez arranca al instante". Pero esa
// caché no es permanente: Safari borra el almacenamiento de un dominio tras
// unos días sin visitarlo, y cualquier navegador la purga cuando el disco se
// llena. Un usuario que vuelve a la semana y se encuentra otra descarga de
// 80 MB sin explicación no vuelve una tercera vez.
//
// Aquí se hacen dos cosas antes de descargar nada: pedir almacenamiento
// persistente (que marca los datos como no desalojables) y comprobar que hay
// sitio, para fallar con un mensaje claro en vez de con un QuotaExceededError
// a mitad de la descarga.

export interface StorageCheck {
  /** Hay espacio suficiente para el modelo. */
  ok: boolean;
  /** Bytes libres estimados, o null si el navegador no lo expone. */
  freeBytes: number | null;
  /** El navegador ha concedido almacenamiento persistente. */
  persisted: boolean;
}

/** Margen sobre el tamaño del modelo: la descarga necesita espacio de trabajo. */
const HEADROOM = 1.5;

export async function ensureStorage(neededBytes: number): Promise<StorageCheck> {
  const storage = navigator.storage as
    | {
        persist?: () => Promise<boolean>;
        persisted?: () => Promise<boolean>;
        estimate?: () => Promise<{ quota?: number; usage?: number }>;
      }
    | undefined;
  if (!storage) return { ok: true, freeBytes: null, persisted: false };

  let persisted = false;
  try {
    // persisted() primero: pedir permiso ya concedido dispara diálogos en
    // algunos navegadores y no hay razón para molestar dos veces.
    persisted = (await storage.persisted?.()) ?? false;
    if (!persisted) persisted = (await storage.persist?.()) ?? false;
  } catch {
    /* el navegador no lo soporta: seguimos, solo perdemos permanencia */
  }

  let freeBytes: number | null = null;
  try {
    const est = await storage.estimate?.();
    if (est && typeof est.quota === "number") {
      freeBytes = Math.max(0, est.quota - (est.usage ?? 0));
    }
  } catch {
    /* ídem */
  }

  // Sin dato fiable no se bloquea nada: es peor impedir una descarga que
  // habría funcionado que dejar que falle con un error claro.
  const ok = freeBytes === null || freeBytes >= neededBytes * HEADROOM;
  return { ok, freeBytes, persisted };
}

/** Bytes → "80 MB" / "1,2 GB", para mensajes de error legibles. */
export function humanBytes(bytes: number, locale: string): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toLocaleString(locale, { maximumFractionDigits: 1 })} GB`;
  return `${Math.round(bytes / 1e6)} MB`;
}
