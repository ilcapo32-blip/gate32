import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Aislamiento de origen cruzado: habilita SharedArrayBuffer y, con él, los
// hilos de WebAssembly en ONNX Runtime. Es la única palanca que mejora el
// camino sin WebGPU, que hoy es inservible (un usuario midió más de una hora
// para 12 minutos de vídeo en Firefox). Se usa `credentialless` en vez de
// `require-corp` porque los scripts de terceros (GoatCounter) se piden en modo
// no-cors y con require-corp quedarían bloqueados; los pesos del modelo van
// por fetch en modo CORS, que no necesita CORP en ninguno de los dos modos.
// En producción las fija vercel.json; aquí, para que las pruebas E2E corran
// exactamente en las mismas condiciones.
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig({
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: page("index.html"),
        en: page("en/index.html"),
        subtitulos: page("subtitulos/index.html"),
        entrevistas: page("entrevistas/index.html"),
        clases: page("clases/index.html"),
        reuniones: page("reuniones/index.html"),
        embed: page("embed/index.html"),
      },
    },
  },
  worker: {
    format: "es",
  },
});
