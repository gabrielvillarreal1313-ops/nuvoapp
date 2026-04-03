# Nuvo

Capa mínima de pruebas automáticas para reducir regresiones en paths críticos mientras seguimos iterando.

## Tests

- `npm test` / `npm run test:run`: ejecuta pruebas unitarias con Vitest.
- `npm run test:watch`: modo watch para desarrollo.

### Cobertura inicial incluida

- `src/lib/timezone-utils.ts`
  - resolución de timezone válida y fallback
  - conversión local->UTC y roundtrip UTC->local
  - clave local de fecha (`getEventLocalDateKey`)
- `src/lib/event-utils.ts`
  - formateo de fecha/hora y texto de invitación
  - validación de que respeta el `timezone`
- `src/lib/home-events-utils.ts`
  - clasificación upcoming/past
  - días con eventos para calendario
  - filtrado de eventos por día
  - merge de eventos de invitado (backend como source of truth)
  - mapping de payload de backend a shape de eventos personales

### Fuera de alcance en esta primera capa

- No se cubre aún la Edge Function completa de Supabase (`supabase/functions/event-api/index.ts`).
- No hay suite e2e pesada (Playwright/Cypress) en este paso.
