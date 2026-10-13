# Inventario y Soporte

Sistema para gestionar el inventario tecnológico y el soporte de un colegio. Los docentes reportan problemas, los técnicos los resuelven con bitácora, y los administradores mantienen dispositivos, ubicaciones y catálogos académicos.

## Stack

- **Backend:** NestJS 12 + TypeORM + PostgreSQL. Autenticación JWT con control de acceso por roles (RBAC: `ADMIN`, `TECNICO`, `DOCENTE`).
- **Frontend:** React 19 + TypeScript + Vite (SPA con enrutado propio por rol y capa de servicios `fetch`).
- **Infra:** Docker Compose (PostgreSQL, backend, frontend y pgAdmin).

## Estructura

- `backend/src/` — módulos `auth`, `users`, `inventory`, `tickets`, `academics`, `software`, `locations` y `common` (filtro global de excepciones).
- `frontend/src/` — `components`, `services`, `styles`, `types` y `routes.ts`.
- `compose.yml` — orquesta Postgres (5432), backend (3000), frontend (5173) y pgAdmin (5050).