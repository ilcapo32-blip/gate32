// Tipos del script de IndexNow. El script es JS puro (corre en Node sin
// compilar) pero las pruebas son TypeScript, así que la parte pura se declara
// aquí, igual que en radar-core.
export function urlsFromSitemap(xml: string): string[];
