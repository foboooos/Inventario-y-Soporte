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
