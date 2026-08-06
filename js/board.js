// ── panel de salidas: datos de vuelos y celdas split-flap ──

const FLAP_CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789-:·";

export const DESTINATIONS = [
  {
    id: "aurora", code: "AUR", flight: "G32-101", name: "AURORA-9",
    tagline: "Donde el cielo ensaya sus cortinas de luz.",
  },
  {
    id: "niebla", code: "MDN", flight: "G32-117", name: "MAR DE NIEBLA",
    tagline: "Un océano que olvidó dónde termina.",
  },
  {
    id: "dunas", code: "DNA", flight: "G32-208", name: "DUNAS DE ÁMBAR",
    tagline: "La arena guarda la última luz del día.",
  },
  {
    id: "nebulosa", code: "NBL", flight: "G32-224", name: "NEBULOSA ÍMPAR",
    tagline: "Polvo de estrellas que nunca se decide.",
  },
  {
    id: "ciudad", code: "LUZ", flight: "G32-313", name: "CIUDAD LUCIÉRNAGA",
    tagline: "Mil ventanas encendidas y nadie duerme.",
  },
  {
    id: "jardin", code: "JRD", flight: "G32-332", name: "JARDÍN CINÉTICO",
    tagline: "Aquí los pétalos tardan años en tocar el suelo.",
  },
  {
    id: "volta", code: "VLT", flight: "G32-355", name: "ISLA VOLTA",
    tagline: "La tormenta es el idioma local.",
  },
  {
    id: "cero", code: "000", flight: "G32-404", name: "ESTACIÓN CERO",
    tagline: "El silencio también es un destino.",
  },
];

const STATUS = {
  ok: { text: "EN HORA", cls: "status-ok" },
  boarding: { text: "EMBARCANDO", cls: "status-boarding" },
  last: { text: "ÚLTIMA LLAMADA", cls: "status-last" },
  delayed: { text: "RETRASADO", cls: "status-delayed" },
  departed: { text: "DESPEGÓ", cls: "status-closed" },
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── celdas split-flap ──

function makeField(parent, width, extraClass) {
  const field = document.createElement("span");
  field.className = `field ${extraClass}`;
  const cells = [];
  for (let i = 0; i < width; i++) {
    const cell = document.createElement("span");
    cell.className = "cell";
    cell.textContent = " ";
    field.appendChild(cell);
    cells.push({ el: cell, char: " ", timer: null });
  }
  parent.appendChild(field);
  return { el: field, cells, width };
}

// gira las solapas de un campo hasta componer el texto objetivo
function setField(field, text) {
  const target = text.toUpperCase().padEnd(field.width).slice(0, field.width);
  field.cells.forEach((cell, i) => {
    const want = target[i];
    if (cell.char === want) return;
    if (cell.timer) clearInterval(cell.timer);
    if (reducedMotion) {
      cell.char = want;
      cell.el.textContent = want === " " ? " " : want;
      return;
    }
    let hops = 2 + Math.floor(Math.random() * 5);
    const delay = Math.random() * 220;
    setTimeout(() => {
      cell.timer = setInterval(() => {
        hops--;
        let ch;
        if (hops <= 0) {
          ch = want;
          clearInterval(cell.timer);
          cell.timer = null;
        } else {
          ch = FLAP_CHARSET[Math.floor(Math.random() * FLAP_CHARSET.length)];
        }
        cell.char = ch;
        cell.el.textContent = ch === " " ? " " : ch;
        cell.el.classList.remove("flap");
        void cell.el.offsetWidth;
        cell.el.classList.add("flap");
      }, 85);
    }, delay);
  });
}

// ── construcción y ciclo de vida del panel ──

export function createBoard(container, onSelect) {
  const flights = DESTINATIONS.map((dest, i) => ({
    dest,
    depart: new Date(Date.now() + (4 + i * 11 + Math.floor(Math.random() * 5)) * 60000),
    delayed: false,
    row: null,
  }));
  // un retraso aleatorio para dar vida al panel
  flights[2 + Math.floor(Math.random() * 5)].delayed = true;

  for (const f of flights) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "flight-row";
    row.setAttribute("role", "listitem");
    row.setAttribute("aria-label", `Vuelo ${f.dest.flight} con destino ${f.dest.name}`);
    f.row = {
      el: row,
      time: makeField(row, 5, "field-time"),
      flight: makeField(row, 7, "field-flight"),
      dest: makeField(row, 17, "field-dest"),
      gate: makeField(row, 2, "field-gate"),
      status: makeField(row, 14, "field-status"),
    };
    row.addEventListener("click", () => onSelect(f.dest));
    container.appendChild(row);
  }

  function statusFor(f) {
    const mins = (f.depart - Date.now()) / 60000;
    if (mins < -1) return STATUS.departed;
    if (f.delayed && mins > 6) return STATUS.delayed;
    if (mins < 3) return STATUS.last;
    if (mins < 9) return STATUS.boarding;
    return STATUS.ok;
  }

  function refresh() {
    for (const f of flights) {
      // los vuelos que despegan se reprograman: la puerta 32 nunca cierra
      if ((f.depart - Date.now()) / 60000 < -3) {
        f.depart = new Date(Date.now() + (75 + Math.random() * 30) * 60000);
        f.delayed = Math.random() < 0.15;
      }
      const st = statusFor(f);
      const hh = String(f.depart.getHours()).padStart(2, "0");
      const mm = String(f.depart.getMinutes()).padStart(2, "0");
      setField(f.row.time, `${hh}:${mm}`);
      setField(f.row.flight, f.dest.flight);
      setField(f.row.dest, f.dest.name);
      setField(f.row.gate, "32");
      setField(f.row.status, st.text);
      f.row.status.el.className = `field field-status ${st.cls}`;
    }
  }

  // arranque escalonado fila a fila, como si el panel despertara
  flights.forEach((f, i) => setTimeout(() => {
    const st = statusFor(f);
    const hh = String(f.depart.getHours()).padStart(2, "0");
    const mm = String(f.depart.getMinutes()).padStart(2, "0");
    setField(f.row.time, `${hh}:${mm}`);
    setField(f.row.flight, f.dest.flight);
    setField(f.row.dest, f.dest.name);
    setField(f.row.gate, "32");
    setField(f.row.status, st.text);
    f.row.status.el.className = `field field-status ${st.cls}`;
  }, 200 + i * 260));

  setInterval(refresh, 30000);
  return { flights };
}

// ── reloj y fecha ──

export function startClock(clockEl, dateEl) {
  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("es-ES", { hour12: false });
    dateEl.textContent = now
      .toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .toUpperCase();
  }
  tick();
  setInterval(tick, 1000);
}

// ── megafonía en el ticker ──

const ANNOUNCEMENTS = [
  "SE RECUERDA A LOS PASAJEROS QUE TODOS LOS VUELOS SALEN DE LA PUERTA 32",
  "OBJETOS PERDIDOS: SE HA ENCONTRADO UNA CONSTELACIÓN SIN DUEÑO EN LA SALA DE ESPERA",
  "EL VUELO A NINGUNA PARTE HA SIDO CANCELADO POR EXISTIR",
  "METEOROLOGÍA: LLUVIA DE IDEAS DÉBIL A PRIMERA HORA, CLAROS DE MEMORIA POR LA TARDE",
  "NO DEJE SU IMAGINACIÓN DESATENDIDA: PODRÍA EMBARCAR SIN USTED",
  "LOS PASAJEROS CON TARJETA DE EMBARQUE PUEDEN SOÑAR POR LA FILA PREFERENTE",
  "ÚLTIMA LLAMADA PARA QUIENES SIGUEN ESPERANDO UNA SEÑAL: ES ESTA",
  "POR MOTIVOS POÉTICOS, EL TIEMPO EN ESTA TERMINAL AVANZA MÁS DESPACIO",
];

export function startTicker(trackEl) {
  const line = ANNOUNCEMENTS.join("   ···   ") + "   ···   ";
  // contenido duplicado para que el bucle del carrusel sea continuo
  trackEl.textContent = line + line;
}
