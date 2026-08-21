// Entrada de las páginas de caso de uso.
//
// Durante dos semanas esto solo importaba los estilos, así que /subtitulos/,
// /entrevistas/, /clases/, /reuniones/ y /notas-de-voz/ **no producían ni una
// visita medible**: toda la estrategia SEO estaba sin instrumentar y no había
// forma de saber si una página traía gente o no. Es el mismo fallo que el radar
// en verde sin abrir issues — algo que parece funcionar porque nadie mira la
// salida.
//
// `initAnalytics` carga GoatCounter, que cuenta la visita por sí solo.
// `trackVisit` registra la vuelta: quien regresa entrando por una página de
// caso de uso también está volviendo, y hasta ahora no se contaba.
import "./styles.css";
import { initAnalytics, trackVisit } from "./lib/analytics";

initAnalytics();
trackVisit();
