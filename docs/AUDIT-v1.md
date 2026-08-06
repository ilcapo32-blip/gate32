# Auditoría técnica · Gate32 v1 ("terminal de embarque")

**Fecha:** 2026-08-06 · **Commit auditado:** `8abfc19`

## Estado

- Sitio 100 % estático (HTML + CSS + JS con módulos ES), sin build ni dependencias.
- Sin `package.json`, sin lockfiles, sin CI, sin tests.
- Sin credenciales, secretos ni variables de entorno: **riesgo de exposición nulo**.
- Sin analítica ni recogida de datos.
- Desplegado en Vercel (deploy estático directo desde `main`).
- Peso del repo dominado por 3 PNG de documentación (~640 KB).

## Veredicto de producto

Experiencia puramente estética inspirada en el nombre ("puerta de embarque").
Sin usuario objetivo, sin problema que resolver, sin mecanismo de demanda,
retención ni monetización. **Descartada como base de producto.**

## Elementos reutilizables

- Nada conceptual. Se conserva únicamente el conocimiento operativo:
  el pipeline GitHub → Vercel → dominio funciona.
- El código v1 queda archivado en el historial de git.

## Punto de restauración

- Tag: `snapshot/gate32-v1` → commit `8abfc19`.
- Restaurar: `git checkout snapshot/gate32-v1`.

## Limitación del entorno de trabajo

El proxy de red de esta sesión bloquea las peticiones directas a
`gate32.autoritasai.com` (403 en CONNECT), por lo que la verificación del
dominio en producción debe hacerse desde fuera del contenedor.
