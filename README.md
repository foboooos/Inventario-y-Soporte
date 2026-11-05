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

## Migraciones

El esquema se versiona con migraciones de TypeORM (`backend/src/database/migrations/`). `DB_SYNCHRONIZE` debe quedar en `false`; en desarrollo `DB_MIGRATIONS_RUN=true` aplica las pendientes al arrancar.

```bash
cd backend
npm run migration:show      # estado de las migraciones
npm run migration:run       # aplicar pendientes
npm run migration:revert    # revertir la última
npm run migration:generate  # generar una nueva desde los cambios de entidades
npm run migration:baseline  # una sola vez en bases creadas con synchronize
```

Una base existente creada con `synchronize` debe marcarse con `migration:baseline` antes de correr migraciones. Una base nueva no necesita baseline: `migration:run` crea todo el esquema.