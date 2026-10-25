# Backend — Inventario y Soporte

API REST en NestJS + TypeORM sobre PostgreSQL. Autenticación JWT y control de acceso por roles aplicado con guards en el backend.

## Módulos

- `auth` — inicio de sesión y emisión de JWT.
- `users` — entidad de usuarios y roles (`ADMIN`, `TECNICO`, `DOCENTE`).
- `inventory` — dispositivos y resumen del inventario.
- `tickets` — tickets de soporte, bandeja técnica, bitácora y secuencia de códigos.
- `academics` — niveles educativos y asignaturas.
- `software` — software educativo y su relación con asignaturas.
- `locations` — ubicaciones jerárquicas (globals y cursos/salas).
- `common` — filtro global de excepciones (mensajes estandarizados en español, sin filtrar detalles internos).

## Datos de prueba (seed)

`npm run seed` puebla la base con los datos de la institución de forma **idempotente** (se puede ejecutar varias veces sin duplicar registros):

- **Ubicaciones** — 13 espacios (laboratorios, biblioteca, dirección, secretaría, casino, gimnasio, etc.) más los cursos bajo "Salas de Clases" (1° Básico A/B … 4° Medio A/B).
- **Niveles educativos** — Pre-Kinder, Kinder, educación básica y media (paralelos A/B).
- **Asignaturas** — el plan de estudios, vinculado a los niveles que corresponden.
- **Software educativo** — programas y sus licencias (`LIBRE`, `GRATUITA`, `COMERCIAL`, `SUSCRIPCION`, `FREEMIUM`), vinculados a asignaturas.
- **Usuarios** — 1 administrador, 2 técnicos y 19 docentes. La contraseña inicial de cada uno es su RUT sin puntos. El administrador y el primer docente se pueden sobreescribir con `SEED_ADMIN_*` y `SEED_TEACHER_*`.
- **Dispositivos** — PCs, proyectores, impresoras y equipos de red distribuidos por las ubicaciones.
- **Tickets** — 20 tickets de ejemplo repartidos entre los docentes agregados, con equipos, ubicaciones y estados variados. Los síntomas están redactados como los escribiría un docente, sin diagnóstico técnico.

Los seeders están en `src/seeds/` y el orquestador en `src/seed.ts`.
