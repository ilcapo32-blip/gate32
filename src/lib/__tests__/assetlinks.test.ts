import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// La app de Android es esta web dentro de Chrome. Chrome solo la abre sin barra
// de direcciones si este archivo dice que la app y la web son del mismo dueño.
// Un carácter mal copiado en una huella no da ningún error: la app sigue
// funcionando, pero con la barra arriba y con pinta de página web. Por eso se
// comprueba aquí y no a ojo.

const links = JSON.parse(readFileSync("public/.well-known/assetlinks.json", "utf8")) as {
  relation: string[];
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
}[];

describe("assetlinks · verificación de la app de Android", () => {
  it("delega en el paquete de Google Play", () => {
    const [entry] = links;
    expect(entry?.relation).toContain("delegate_permission/common.handle_all_urls");
    expect(entry?.target.namespace).toBe("android_app");
    expect(entry?.target.package_name).toBe("com.autoritasai.gate32");
  });

  it("cada huella es un SHA-256 en el formato que espera Android", () => {
    const prints = links.flatMap((l) => l.target.sha256_cert_fingerprints);
    expect(prints.length).toBeGreaterThan(0);
    for (const p of prints) expect(p).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    expect(new Set(prints).size).toBe(prints.length);
  });
});
