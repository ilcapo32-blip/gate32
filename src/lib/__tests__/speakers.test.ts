import { describe, it, expect } from "vitest";
import {
  labelTrack,
  interleave,
  containment,
  dropEcho,
  mergeTurns,
  hasSpeakers,
  meetingConversation,
  combineTracks,
  labelFromFileName,
  renameSpeaker,
} from "../speakers";
import type { Segment } from "../types";

// «Whisper, por sí sola, te deja una pared de texto sin diferenciar» — garse,
// r/podcasting. Era la carencia número uno del producto. Estas pruebas cubren
// la separación por pistas: cada voz en su archivo, nada que adivinar.

const seg = (start: number, end: number, text: string): Segment => ({ start, end, text });

describe("speakers · entrelazar pistas", () => {
  it("cada línea conserva la persona de su pista", () => {
    const ana = labelTrack([seg(0, 2, "Hola, bienvenido.")], "Ana");
    expect(ana[0]?.speaker).toBe("Ana");
  });

  it("ordena la conversación por el momento en que habla cada uno", () => {
    const ana = labelTrack([seg(0, 2, "Pregunta uno"), seg(10, 12, "Pregunta dos")], "Ana");
    const luis = labelTrack([seg(3, 9, "Respuesta uno"), seg(13, 20, "Respuesta dos")], "Luis");
    const out = interleave([ana, luis]);
    expect(out.map((s) => s.speaker)).toEqual(["Ana", "Luis", "Ana", "Luis"]);
  });

  it("es estable: si empiezan a la vez, manda el orden de las pistas", () => {
    // Sin esto, la misma entrevista podía exportarse distinta dos veces.
    const a = labelTrack([seg(5, 6, "a")], "A");
    const b = labelTrack([seg(5, 6, "b")], "B");
    expect(interleave([a, b]).map((s) => s.speaker)).toEqual(["A", "B"]);
    expect(interleave([b, a]).map((s) => s.speaker)).toEqual(["B", "A"]);
  });

  it("no se deja ninguna línea por el camino", () => {
    const a = labelTrack([seg(0, 1, "1"), seg(4, 5, "3")], "A");
    const b = labelTrack([seg(2, 3, "2")], "B");
    expect(interleave([a, b])).toHaveLength(3);
  });
});

describe("speakers · el eco del micrófono", () => {
  it("mide qué parte de lo que dice el micro ya está en la pestaña", () => {
    expect(containment("vamos a revisar el presupuesto", "Vamos a revisar el presupuesto, ¿vale?")).toBe(1);
    expect(containment("me parece bien", "vamos a revisar el presupuesto")).toBe(0);
  });

  it("ignora mayúsculas, tildes y puntuación al comparar", () => {
    expect(containment("Está ahí", "esta ahi")).toBe(1);
  });

  it("quita del micro la copia de lo que sonó por los altavoces", () => {
    // Sin auriculares, la voz de los demás entra también por el micrófono y
    // aparecería dos veces: una como «Los demás» y otra como «Tú».
    const tab = [seg(10, 14, "Vamos a revisar el presupuesto del trimestre")];
    const mic = [seg(10.4, 14.2, "vamos a revisar el presupuesto del trimestre")];
    expect(dropEcho(mic, tab)).toHaveLength(0);
  });

  it("conserva lo que dijiste tú, aunque fuera a la vez", () => {
    const tab = [seg(10, 14, "Vamos a revisar el presupuesto del trimestre")];
    const mic = [seg(11, 13, "Yo creo que primero habría que cerrar marzo")];
    expect(dropEcho(mic, tab)).toHaveLength(1);
  });

  it("no juzga intervenciones cortas: un «sí, claro» puede ser tuyo", () => {
    // Ante la duda se conserva. Duplicar se ve y se corrige; borrar algo que
    // dijiste de verdad no se ve nunca (regla 8).
    const tab = [seg(10, 12, "sí claro")];
    const mic = [seg(10, 12, "sí claro")];
    expect(dropEcho(mic, tab)).toHaveLength(1);
  });

  it("compara con todo lo que dijo la pestaña en ese rato, no con un trozo suelto", () => {
    // Whisper corta cada pista por sitios distintos: el eco de una frase puede
    // caer encima de dos segmentos de la pestaña.
    const tab = [seg(10, 12, "vamos a revisar"), seg(12, 15, "el presupuesto del trimestre")];
    const mic = [seg(10.5, 14.5, "vamos a revisar el presupuesto del trimestre")];
    expect(dropEcho(mic, tab)).toHaveLength(0);
  });

  it("no confunde con eco algo dicho lejos en el tiempo", () => {
    const tab = [seg(10, 14, "vamos a revisar el presupuesto del trimestre")];
    const mic = [seg(300, 304, "vamos a revisar el presupuesto del trimestre")];
    expect(dropEcho(mic, tab)).toHaveLength(1);
  });
});

describe("speakers · reunión completa", () => {
  it("etiqueta tu micro y la pestaña, y quita el eco", () => {
    const tab = [seg(0, 4, "Buenos días a todos, empezamos ya"), seg(9, 12, "Perfecto, siguiente punto")];
    const mic = [
      seg(0.3, 4.1, "buenos días a todos empezamos ya"), // eco
      seg(5, 8, "Yo traigo los números de marzo"),
    ];
    const out = meetingConversation(mic, tab, { me: "Tú", others: "Los demás" });
    expect(out.map((s) => `${s.speaker}: ${s.text}`)).toEqual([
      "Los demás: Buenos días a todos, empezamos ya",
      "Tú: Yo traigo los números de marzo",
      "Los demás: Perfecto, siguiente punto",
    ]);
  });
});

describe("speakers · turnos", () => {
  it("junta los cortes de Whisper de una misma persona en un turno", () => {
    const out = mergeTurns(
      labelTrack([seg(0, 3, "Bueno,"), seg(3.2, 6, "lo que quería decir"), seg(6.1, 9, "es esto.")], "Ana"),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe("Bueno, lo que quería decir es esto.");
    expect(out[0]?.end).toBe(9);
  });

  it("una pausa larga de la misma persona abre turno nuevo", () => {
    const out = mergeTurns(labelTrack([seg(0, 3, "Primera idea."), seg(20, 23, "Otra cosa.")], "Ana"));
    expect(out).toHaveLength(2);
  });

  it("cambiar de persona siempre abre turno", () => {
    const out = mergeTurns(
      interleave([labelTrack([seg(0, 2, "¿Qué tal?")], "Ana"), labelTrack([seg(2.1, 4, "Bien.")], "Luis")]),
    );
    expect(out.map((s) => s.speaker)).toEqual(["Ana", "Luis"]);
  });

  it("no modifica los segmentos que recibe", () => {
    const input = labelTrack([seg(0, 1, "a"), seg(1.1, 2, "b")], "A");
    mergeTurns(input);
    expect(input[0]?.text).toBe("a");
  });
});

describe("speakers · detección", () => {
  it("una transcripción normal no lleva etiquetas", () => {
    expect(hasSpeakers([seg(0, 1, "hola")])).toBe(false);
  });
  it("una por pistas sí", () => {
    expect(hasSpeakers(labelTrack([seg(0, 1, "hola")], "Ana"))).toBe(true);
  });
});


describe("speakers · combinar pistas", () => {
  it("reunión: tu micro como «Tú», la pestaña como «Los demás», sin eco", () => {
    const out = combineTracks("meeting", [
      { label: "Tú", segments: [seg(0.2, 3, "hola a todos qué tal estáis"), seg(5, 7, "Yo empiezo")] },
      { label: "Los demás", segments: [seg(0, 3, "Hola a todos, ¿qué tal estáis?")] },
    ]);
    expect(out.map((s) => s.speaker)).toEqual(["Los demás", "Tú"]);
  });

  it("entrevista: cada archivo es una persona y no se quita nada", () => {
    // En una entrevista a doble pista cada uno tiene su micro: dos frases
    // iguales son dos personas diciendo lo mismo, no eco.
    const out = combineTracks("interview", [
      { label: "Ana", segments: [seg(0, 3, "estoy de acuerdo con eso")] },
      { label: "Luis", segments: [seg(0.5, 3, "estoy de acuerdo con eso")] },
    ]);
    expect(out).toHaveLength(2);
  });
});

describe("speakers · nombre desde el archivo", () => {
  it("usa el nombre cuando parece el de una persona", () => {
    expect(labelFromFileName("ana.wav", "Persona 1")).toBe("ana");
    expect(labelFromFileName("Luis-local.m4a", "Persona 2")).toBe("Luis-local");
    expect(labelFromFileName("Maria_Garcia.mp3", "Persona 1")).toBe("Maria Garcia");
  });

  it("no pone identificadores de sistema delante de cada línea", () => {
    expect(labelFromFileName("zoom_0_1729384551.m4a", "Persona 1")).toBe("Persona 1");
    expect(labelFromFileName("audio.wav", "Persona 2")).toBe("Persona 2");
    expect(labelFromFileName("track 2.wav", "Persona 2")).toBe("Persona 2");
    expect(labelFromFileName("0001.mp3", "Persona 1")).toBe("Persona 1");
  });
});

describe("speakers · renombrar", () => {
  it("cambia el nombre en todas las líneas de esa persona y solo en esas", () => {
    const conv = [
      { ...seg(0, 1, "a"), speaker: "Los demás" },
      { ...seg(1, 2, "b"), speaker: "Tú" },
      { ...seg(2, 3, "c"), speaker: "Los demás" },
    ];
    const out = renameSpeaker(conv, "Los demás", "Cliente");
    expect(out.map((s) => s.speaker)).toEqual(["Cliente", "Tú", "Cliente"]);
    expect(conv[0]?.speaker).toBe("Los demás");
  });

  it("un nombre vacío no borra la etiqueta", () => {
    const conv = [{ ...seg(0, 1, "a"), speaker: "Ana" }];
    expect(renameSpeaker(conv, "Ana", "   ")[0]?.speaker).toBe("Ana");
  });
});
