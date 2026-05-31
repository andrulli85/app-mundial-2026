# Albumix

PWA local-first de intercambio de figuritas Panini FIFA World Cup 2026.

**Uso:** abrir la URL en el browser, instalar en pantalla de inicio, funciona offline.

---

## Setup

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build            # build de producción
npm run start            # servidor de producción local
npm run lint             # ESLint (zero warnings)
npm run import-seed      # importar + comprimir fotos de figuritas
npm run import-seed:dry  # preview de la importación sin copiar archivos
```

## Arquitectura

**100% local-first. Sin servidor, sin base de datos, sin auth.**

Todo el estado vive en **IndexedDB** del dispositivo. Cerrar o limpiar el browser borra los datos hasta Fase 5 (cloud sync, opcional, post-Mundial).

```
src/
  app/
    page.tsx          — Onboarding (primera vez: pide nickname)
    album/page.tsx    — Álbum 980 figuritas (tap para marcar)
    trade/page.tsx    — Intercambio QR (3 pasos)
    settings/page.tsx — Cambiar nick, backup, info
  lib/
    db.ts             — IndexedDB schema + helpers (idb)
    catalog.ts        — Catálogo 980 figuritas + colores de equipo
    qr-engine.ts      — Interface QR (placeholder — Stream C implementa)
  components/
    EmptySlot.tsx     — Celda vacía estilo álbum físico (Bowlby One + team color)
    StickerCard.tsx   — Celda del grid (foto real o EmptySlot)
    QrRenderer.tsx    — Renderiza QR desde payload string
    QrScanner.tsx     — Escanea QR con cámara (@zxing/browser)
    RegisterSW.tsx    — Registra service worker
public/
  manifest.json       — PWA manifest
  sw.js               — Service worker (cache-first assets, network-first pages)
  stickers/seed/      — Fotos comprimidas (generadas por import-seed.mjs)
  stickers/seed-manifest.json  — sticker_id → filename map
scripts/
  import-seed.mjs     — Importa + comprime fotos del seed (requiere sharp)
```

## IndexedDB Schema

```
DB: mundial-2026 v1
├── collection  { sticker_id, count, acquired_at }
├── profile     { key, value }   (key = "nickname")
└── trade_log   { trade_id, ts, partner, gave[], received[] }
```

## Seed de figuritas

43 fotos reales importadas desde `tools/scripts/mundial-2026-visuals/seed/`.
Las demás 937 celdas usan el componente `<EmptySlot>` que replica el diseño auténtico del álbum físico.

Para re-importar seed:
```bash
npm run import-seed:dry   # verificar mapping primero
npm run import-seed       # ejecutar
```

## Despliegue

Vercel free tier. Push a `main` → deploy automático.

## PWA — Instalar en pantalla de inicio

**iPhone (iOS Safari):** botón Compartir → "Agregar a pantalla de inicio"

**Android (Chrome):** banner "Instalar app" aparece automáticamente

## Trade QR — Flujo

```
Teléfono A                    Teléfono B
────────────────────────────────────────
1. A selecciona qué da + qué quiere
2. A genera QR_A1 (req)
                    ← B escanea QR_A1
                       B ve la propuesta, acepta
                       B genera QR_B2 (acc), actualiza IndexedDB
3. A escanea QR_B2, actualiza IndexedDB
   ✅ Listo
```

## Fases

- **Fase 0** Done — investigación + scrape dataset
- **Fase 1** Done — co-diseño con sobrino (papel)
- **Fase 2** Done — scaffold + álbum (este repo)
- **Fase 3** Pending — motor de intercambio completo
- **Fase 4** Pending — polish + distribución URL
- **Fase 5** Deferred — cloud sync (post-Mundial)

**Deadline:** 2026-06-10 (un día antes del partido inaugural)
