/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origen alternativo para descargar los pesos del modelo, con la barra
   * final incluida (p. ej. "https://modelos.midominio.com/"). Si no se
   * define, se usa el CDN de Hugging Face. Permite autoalojar Gate32 sin
   * ninguna llamada a terceros.
   */
  readonly VITE_MODEL_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
