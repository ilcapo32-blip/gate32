// Idiomas que se ofrecen para transcribir.
//
// Whisper reconoce cerca de cien idiomas; nosotros ofrecíamos diez. Eso no era
// una limitación técnica —el código de idioma se pasa tal cual al modelo—, era
// una lista escrita a mano y nunca revisada. Un hilo de r/notebooklm (45 votos)
// lo dejó claro: quien preguntaba tenía clases de horas **en vietnamita**, y el
// dolor que más se repetía en 24 comentarios era justamente "las clases no
// están en inglés". Con el desplegable anterior no podía ni elegir su idioma.
//
// La lista vive aquí y las opciones se pintan desde JavaScript: repetirlas en
// cada página HTML era garantía de que se desincronizaran, que es el error que
// ya nos costó los datos estructurados.

export interface LanguageOption {
  /** Código ISO que entiende Whisper. */
  code: string;
  es: string;
  en: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "de", es: "Alemán", en: "German" },
  { code: "ar", es: "Árabe", en: "Arabic" },
  { code: "bn", es: "Bengalí", en: "Bengali" },
  { code: "bg", es: "Búlgaro", en: "Bulgarian" },
  { code: "ca", es: "Catalán", en: "Catalan" },
  { code: "cs", es: "Checo", en: "Czech" },
  { code: "zh", es: "Chino", en: "Chinese" },
  { code: "ko", es: "Coreano", en: "Korean" },
  { code: "hr", es: "Croata", en: "Croatian" },
  { code: "da", es: "Danés", en: "Danish" },
  { code: "sk", es: "Eslovaco", en: "Slovak" },
  { code: "sl", es: "Esloveno", en: "Slovenian" },
  { code: "es", es: "Español", en: "Spanish" },
  { code: "et", es: "Estonio", en: "Estonian" },
  { code: "eu", es: "Euskera", en: "Basque" },
  { code: "fi", es: "Finés", en: "Finnish" },
  { code: "fr", es: "Francés", en: "French" },
  { code: "gl", es: "Gallego", en: "Galician" },
  { code: "el", es: "Griego", en: "Greek" },
  { code: "he", es: "Hebreo", en: "Hebrew" },
  { code: "hi", es: "Hindi", en: "Hindi" },
  { code: "hu", es: "Húngaro", en: "Hungarian" },
  { code: "id", es: "Indonesio", en: "Indonesian" },
  { code: "en", es: "Inglés", en: "English" },
  { code: "it", es: "Italiano", en: "Italian" },
  { code: "ja", es: "Japonés", en: "Japanese" },
  { code: "lv", es: "Letón", en: "Latvian" },
  { code: "lt", es: "Lituano", en: "Lithuanian" },
  { code: "ms", es: "Malayo", en: "Malay" },
  { code: "ml", es: "Malayalam", en: "Malayalam" },
  { code: "nl", es: "Neerlandés", en: "Dutch" },
  { code: "no", es: "Noruego", en: "Norwegian" },
  { code: "fa", es: "Persa", en: "Persian" },
  { code: "pl", es: "Polaco", en: "Polish" },
  { code: "pt", es: "Portugués", en: "Portuguese" },
  { code: "ro", es: "Rumano", en: "Romanian" },
  { code: "ru", es: "Ruso", en: "Russian" },
  { code: "sw", es: "Suajili", en: "Swahili" },
  { code: "sv", es: "Sueco", en: "Swedish" },
  { code: "tl", es: "Tagalo", en: "Tagalog" },
  { code: "th", es: "Tailandés", en: "Thai" },
  { code: "ta", es: "Tamil", en: "Tamil" },
  { code: "te", es: "Telugu", en: "Telugu" },
  { code: "tr", es: "Turco", en: "Turkish" },
  { code: "uk", es: "Ucraniano", en: "Ukrainian" },
  { code: "ur", es: "Urdu", en: "Urdu" },
  { code: "vi", es: "Vietnamita", en: "Vietnamese" },
];

/**
 * Idiomas que los modelos pequeños ya transcriben bien.
 *
 * El entrenamiento de Whisper está dominado por el inglés y un puñado de
 * lenguas europeas y asiáticas mayoritarias. Fuera de ese grupo, `tiny` y
 * `base` pierden muchísima precisión mientras que los modelos grandes aguantan.
 * De ahí la queja del hilo —"probé Whisper y el vietnamita salió sorprendemente
 * malo"—: probablemente no era Whisper, era el tamaño del modelo.
 *
 * La lista es deliberadamente corta. Ante la duda, avisar de más: el coste de
 * sugerir un modelo mayor que no hacía falta es una descarga; el de callar es
 * que alguien concluya que la herramienta no sirve para su idioma.
 */
const WELL_COVERED = new Set([
  "en", "es", "de", "fr", "it", "pt", "nl", "ru", "pl", "ca", "ja", "ko", "zh",
]);

/** ¿Conviene avisar de que en este idioma el modelo pequeño se queda corto? */
export function needsBiggerModel(language: string, quality: string): boolean {
  if (language === "auto" || WELL_COVERED.has(language)) return false;
  return quality === "fast" || quality === "balanced";
}
