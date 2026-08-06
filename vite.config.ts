import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: page("index.html"),
        subtitulos: page("subtitulos/index.html"),
        entrevistas: page("entrevistas/index.html"),
        clases: page("clases/index.html"),
      },
    },
  },
  worker: {
    format: "es",
  },
});
