# Frontend — Inventario y Soporte

SPA en React 19 + TypeScript + Vite. No usa router externo: el enrutado vive en `routes.ts` y `App.tsx`, y se resuelve según el rol del usuario autenticado. La capa `services/*` centraliza las llamadas `fetch` con el token Bearer.

## Estructura

- `components/` — páginas, formularios y diálogos.
- `services/` — cliente HTTP y endpoints por dominio.
- `styles/` — tokens de diseño y hojas por área.
- `types/` — tipos compartidos.

La URL del backend se define con `VITE_API_URL` (por defecto `http://localhost:3000`).
