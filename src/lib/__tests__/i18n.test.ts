import { describe, expect, it } from "vitest";
import { t } from "../i18n";

describe("i18n · sustitución", () => {
  // El aviso de audio a medias repite {got}, y el 25/10 salió en pantalla con
  // el segundo sin sustituir: «pulsa en el reproductor más allá de {got}».
  it("sustituye todas las apariciones de un marcador, no solo la primera", () => {
    const s = t("short_read", { got: "33:51", total: "1:02:00" });
    expect(s).not.toContain("{got}");
    expect(s.split("33:51")).toHaveLength(3);
  });

  it("ningún texto con variables se queda con marcadores sin rellenar", () => {
    const s = t("tracks_confirm", { n: "2", list: "«a», «b»", a: "a.wav" });
    expect(s).not.toMatch(/\{\w+\}/);
  });
});
