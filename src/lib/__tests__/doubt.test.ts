import { describe, it, expect } from "vitest";
import { findDoubts } from "../doubt";
import type { Segment } from "../types";

const seg = (start: number, end: number, text: string): Segment => ({ start, end, text });

describe("findDoubts", () => {
  // El criterio de diseño: una marca falsa cuesta más que una que falta. Si se
  // marca la mitad de la transcripción, la marca no significa nada.
  it("no marca nada en una transcripción normal", () => {
    // Texto real de la prueba del 20/08: nota de voz de 21 segundos, castellano
    // corriente a unas tres palabras por segundo.
    const segments = [
      seg(0, 5, "Amigo, buenas tardes, perdona la hora pero es que me acaba de contestar."),
      seg(
        5,
        14,
        "Vale, voy a querer la batería. Eso me la podéis mandar vosotros en la mañana o paso yo a recogerla.",
      ),
      seg(14, 17, "Sería al contado."),
      seg(17, 21, "Vale, pero lo hacemos al contado. Ya me lo has dicho, gracias."),
    ];
    expect(findDoubts(segments).size).toBe(0);
  });

  it("marca el bloque que repite el anterior palabra por palabra", () => {
    const segments = [
      seg(0, 3, "esto lo dijo una vez"),
      seg(3, 6, "Esto lo dijo una vez."),
    ];
    const doubts = findDoubts(segments);
    expect(doubts.get(1)).toBe("repeat");
    // El primero es legítimo: alguien lo dijo. El sospechoso es el eco.
    expect(doubts.has(0)).toBe(false);
  });

  it("no confunde una respuesta corta repetida con un bucle", () => {
    // "Sí." dos veces seguidas es una conversación, no un fallo del modelo.
    const segments = [seg(0, 1, "Sí."), seg(1, 2, "Sí.")];
    expect(findDoubts(segments).size).toBe(0);
  });

  it("marca la palabra repetida en bucle dentro de un bloque", () => {
    // El fallo clásico de Whisper cuando se queda enganchado.
    const segments = [seg(0, 8, "y entonces no no no no no no no me lo dijo")];
    expect(findDoubts(segments).get(0)).toBe("repeat");
  });

  it("no marca una repetición de énfasis", () => {
    const segments = [seg(0, 3, "no, no, no, eso no fue así")];
    expect(findDoubts(segments).size).toBe(0);
  });

  it("marca la frase de subtítulo que el modelo escribe sobre el silencio", () => {
    const segments = [
      seg(0, 4, "Con esto terminamos la sesión de hoy."),
      seg(4, 9, "Subtítulos realizados por la comunidad de Amara.org"),
    ];
    expect(findDoubts(segments).get(1)).toBe("boilerplate");
  });

  it("marca texto imposible de pronunciar en el tiempo que ocupa", () => {
    // Veinte palabras en dos segundos: nadie habla así. Va dentro de una
    // transcripción normal, que es como llega de verdad.
    const segments = [
      seg(0, 5, "esto es una frase perfectamente normal y corriente"),
      seg(5, 7, "una dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte"),
      seg(7, 12, "y aquí se sigue hablando con toda tranquilidad"),
    ];
    expect(findDoubts(segments).get(1)).toBe("fast");
    expect(findDoubts(segments).size).toBe(1);
  });

  it("no marca una frase corta y rápida", () => {
    // Tres palabras en medio segundo dan seis por segundo, pero el bloque es
    // demasiado corto para juzgar el ritmo: el redondeo manda.
    const segments = [seg(0, 0.5, "sí, claro, vale")];
    expect(findDoubts(segments).size).toBe(0);
  });

  it("marca los segundos de audio que quedaron en casi nada", () => {
    const segments = [
      seg(0, 5, "una frase normal para que haya contexto alrededor"),
      seg(5, 25, "ya"),
      seg(25, 30, "y luego la conversación continúa sin problema"),
    ];
    expect(findDoubts(segments).get(1)).toBe("slow");
  });

  it("no marca un silencio corto con pocas palabras", () => {
    const segments = [seg(0, 4, "ya")];
    expect(findDoubts(segments).size).toBe(0);
  });

  // La alarma que saltó el 24/08: el 100 % de las transcripciones marcadas
  // tenían cinco líneas o más señaladas. Marcar media transcripción no informa
  // de nada, así que a partir de una cuarta parte se desconfía del marcado y se
  // conservan solo las reglas que no dependen de los tiempos.
  it("si se marcaría media transcripción, solo quedan las reglas concluyentes", () => {
    // Textos distintos entre sí: lo que se quiere provocar es la regla de
    // ritmo, no la de eco, que se dispararía si todos fueran iguales.
    const rapida = (n: number) =>
      `bloque ${n} con muchas palabras metidas en muy poquísimo tiempo de audio`;
    const segments = [
      seg(0, 1, rapida(1)),
      seg(1, 2, rapida(2)),
      seg(2, 3, rapida(3)),
      seg(3, 4, rapida(4)),
      seg(4, 5, rapida(5)),
      seg(5, 9, "esto lo dijo una vez"),
      seg(9, 13, "Esto lo dijo una vez."),
      seg(13, 18, "y aquí termina con normalidad"),
    ];
    const marcados = findDoubts(segments);
    // Sobrevive el eco, que es concluyente; se descartan los cinco de ritmo.
    expect([...marcados.values()]).toEqual(["repeat"]);
  });

  it("con pocos bloques el techo no se aplica, porque la proporción no dice nada", () => {
    // Una nota de voz de dos bloques: marcar uno ya sería el 50 %.
    const segments = [
      seg(0, 5, "una frase normal"),
      seg(5, 25, "ya"),
    ];
    expect(findDoubts(segments).get(1)).toBe("slow");
  });

  it("aguanta marcas de tiempo degeneradas sin marcar por dividir entre cero", () => {
    const segments = [seg(5, 5, "hola qué tal"), seg(5, 4, "esto va al revés")];
    expect(findDoubts(segments).size).toBe(0);
  });

  it("ignora los bloques vacíos", () => {
    expect(findDoubts([seg(0, 3, "   "), seg(3, 6, "")]).size).toBe(0);
  });
});
