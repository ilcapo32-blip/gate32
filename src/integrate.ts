// Entrada de la página de integración (la propuesta B2B).
//
// Por qué esta página tiene script propio y las demás no: lleva una demo real
// del embed, y esa demo se carga **solo al pulsar**. Si el iframe se montara
// con la página, cada visita ociosa arrancaría la aplicación y ensuciaría el
// embudo — `transcribe_start`, `model_ready` y compañía — con gente que solo
// estaba leyendo. Al exigir un clic, cada prueba es una prueba de verdad.
//
// Y ese clic es en sí mismo la señal que aquí importa. La medición de este
// proyecto está atascada porque los umbrales de monetización piden cientos de
// activaciones y hacemos decenas. Este embudo es otro: una plataforma que
// prueba la integración es n = 1, y un correo es el resultado.
import "./styles.css";
import { initAnalytics, track, trackVisit } from "./lib/analytics";

initAnalytics();
trackVisit();

const slot = document.querySelector<HTMLElement>("#demo-slot");
const btn = document.querySelector<HTMLButtonElement>("#demo-btn");

btn?.addEventListener("click", () => {
  if (!slot || slot.dataset["loaded"] === "1") return;
  slot.dataset["loaded"] = "1";
  track("integrate_demo");

  const lang = document.documentElement.lang === "es" ? "es" : "en";
  const frame = document.createElement("iframe");
  frame.src = `/embed/?lang=${lang}&model=fast`;
  frame.title = lang === "es" ? "Gate32 integrado" : "Gate32 embedded";
  frame.className = "demo-frame";
  // Sin esto el usuario de la demo no puede probar la grabación, que es una de
  // las cosas que una plataforma querría evaluar.
  frame.allow = "microphone";
  slot.replaceChildren(frame);
  btn.hidden = true;
});

// Quien copia el iframe es quien está integrando de verdad, no quien lee.
document.querySelector<HTMLButtonElement>("#copy-embed")?.addEventListener("click", (e) => {
  const code = document.querySelector<HTMLElement>("#embed-code")?.textContent ?? "";
  void navigator.clipboard?.writeText(code).then(() => {
    track("integrate_copy");
    const b = e.currentTarget as HTMLButtonElement;
    const antes = b.textContent;
    b.textContent = document.documentElement.lang === "es" ? "Copiado" : "Copied";
    setTimeout(() => {
      b.textContent = antes;
    }, 1600);
  });
});

// El correo es el objetivo declarado de la página: sin esto no sabríamos si
// alguien llegó hasta el final y decidió escribir.
document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach((a) => {
  a.addEventListener("click", () => track("integrate_contact"));
});
