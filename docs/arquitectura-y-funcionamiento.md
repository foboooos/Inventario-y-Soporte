# Arquitectura y funcionamiento del proyecto

## 1. Propósito y perfiles

La aplicación organiza el soporte tecnológico de un colegio. Sus tres perfiles tienen responsabilidades diferenciadas:

| Perfil | Flujos principales |
|---|---|
| `DOCENTE` | Crear tickets, asociarlos a una ubicación y opcionalmente un dispositivo, y consultar su propio historial. |
| `TECNICO` | Consultar la bandeja, iniciar el trabajo, cambiar estados permitidos, resolver y documentar causa raíz/solución en bitácora; consultar y mantener inventario. |
| `ADMIN` | Administrar usuarios, ubicaciones, niveles, asignaturas y software; además puede consultar bandeja e inventario y asistir en flujos técnicos. |

## 2. Arquitectura por capas

### Responsabilidades del backend

- `auth`: selección de usuario, validación de credenciales y JWT.
- `users`: administración de personas, roles, hashes y fecha de nacimiento cifrada.
- `tickets`: creación, listados paginados, transiciones y resolución con bitácora.
- `inventory`: CRUD, búsqueda, estados y generación concurrente de códigos de activo.
- `locations`: ubicaciones globales y cursos jerárquicos.
- `academics`: niveles, asignaturas y relación entre ambos.
- `software`: catálogo de programas y relación con asignaturas.
- `health`: comprueba la conexión a PostgreSQL (`SELECT 1`).
- `common`: filtro global que transforma errores en respuestas en español y evita exponer detalles internos.

### Responsabilidades del frontend

- `App.tsx` coordina login, sesión y navegación interna sin router de terceros.
- `components/` contiene formularios, páginas, navegación, modales, historial y PDF.
- `services/http.ts` centraliza llamadas HTTP e incluye Bearer token; cada dominio define sus operaciones en `services/`.
- `types/` mantiene tipos de transporte y modelos de vista.
- `styles/` separa tokens, base, layout, campos, diálogos, páginas, responsive y estilos de impresión.

## 3. Inicio de sesión y sesión

1. El selector público muestra nombres y asocia internamente un `login_id` UUID.
2. La contraseña actual admite RUT sin puntos o fecha de nacimiento `DDMMYYYY`; ambos valores se contrastan contra hashes bcrypt.
3. El endpoint de login limita intentos por IP. El endpoint del selector también limita la tasa.
4. El token incorpora la identidad como `sub`, email y rol. El guard consulta al usuario actual para tomar el rol vigente y rechazar cuentas eliminadas.
5. Si el usuario marca “Recordar usuario”, el token se guarda en `localStorage`; en caso contrario, en `sessionStorage`. El perfil no se persiste.

Diagrama: [secuencia de login](diagramas/diagrama-secuencia-login.png).

## 4. Autorización

| Área | Lectura | Escritura |
|---|---|---|
| Inicio de sesión | Público con limitación de tasa | — |
| Perfil de sesión | Cualquier token válido | — |
| Tickets propios | Docente | Docente crea; solicitante se obtiene del JWT, no del cuerpo. |
| Bandeja y bitácora | Técnico, administrador | Técnico y administrador gestionan estado/resolución. |
| Opciones de dispositivo | Docente, técnico, administrador | — |
| Inventario | Técnico y administrador para listado; opciones disponibles a perfiles de soporte | Técnico y administrador. |
| Ubicaciones, niveles, asignaturas, software | Lecturas permitidas por endpoint | Administrador. |
| Usuarios | Administrador | Administrador. |
| Health | Público | — |

## 5. Ciclo de vida del ticket

1. `POST /tickets` obtiene el solicitante de la identidad autenticada y comprueba que la ubicación existe. El dispositivo relacionado es opcional; en caso de ser proporcionado, su ubicación prevalece como snapshot del ticket.
2. La creación es transaccional. La fila de secuencia anual se inserta si falta, se bloquea y se incrementa. El código visible sigue el formato `TCK-AAAA-0001`. El identificador interno `id_ticket` es independiente.
3. Tras confirmar la transacción de creación, el backend publica un evento `ticket.created` con el código visible del ticket. Un técnico/administrador conectado reciben el aviso, y se muestra un toast global en cualquier ruta.
4. La conexión SSE usa el mismo JWT Bearer y permanece abierta mientras la sesión sea de técnico o administrador. El cliente resincroniza al conectar, recuperar el foco o volver a la pestaña. El stream es en memoria: requiere una sola instancia del backend.
5. Docentes consultan solo sus propios registros. Técnico/administrador consultan la bandeja con estado, ubicación y rango de fechas, paginados en servidor.
6. Las transiciones válidas se definen en `ticket-status-transitions.ts`. El cambio usa actualización condicional para detectar que otra solicitud modificó el estado.
7. Resolver requiere causa raíz y solución. Si el ticket tiene dispositivo, obliga a indicar su estado final y actualiza el activo en la misma transacción que la bitácora. Si el ticket no tiene dispositivo, la bitácora conserva tipo/código como valores vacíos.
8. El endpoint de bitácora solo devuelve el documento cuando el ticket está resuelto. `TicketLogDocument.tsx` construye la vista imprimible/PDF con el código del ticket como nombre de archivo sugerido.

Diagrama: [estados de tickets](diagramas/diagrama-estados-tickets.png).

## 6. Inventario y catálogos

### Inventario

- Cada dispositivo contiene tipo, marca/modelo (opcionales), ubicación textual, estado y fecha de ingreso.
- El código se compone desde tipo y sigla de ubicación. Para cursos se utiliza la sigla reservada de cursos.
- Filtro de estado/ubicación, ordenamiento y paginación.
- Al eliminar un dispositivo, sus tickets mantienen historia y ponen `id_dispositivo` en `NULL`.

### Ubicaciones y catálogos académicos

- `ubicaciones` modela ubicaciones principales y niveles inferiores/cursos.
- Los niveles educativos se relacionan con asignaturas.
- El software educativo se relaciona con asignaturas, y una licencia pertenece a un enum.

## 7. API y validación

| Método/ruta | Actor típico | Efecto |
|---|---|---|
| `POST /auth/login` | Público | Valida identidad/contraseña y devuelve JWT. |
| `GET /auth/users` | Público | Devuelve nombres de selección y UUID de login. |
| `GET /auth/me` | Sesión | Devuelve la identidad/rol actual. |
| `GET /tickets` | Docente | Historial propio, paginado. |
| `POST /tickets` | Docente | Crea solicitud. |
| `GET /tickets/inbox` | Técnico/administrador | Bandeja paginada y filtrable. |
| `GET /tickets/events` | Técnico/administrador | Stream SSE autenticado con avisos de nuevos tickets. |
| `PATCH /tickets/:id_ticket/status` | Técnico/administrador | Transición simple. |
| `PATCH /tickets/:id_ticket` | Técnico/administrador | Resuelve, completa bitácora y actualiza estado del activo si aplica. |
| `GET /tickets/:id_ticket/bitacora` | Técnico/administrador | Datos de documento resuelto. |
| `/inventory` y subrutas | Técnico/administrador | Lectura, código siguiente y CRUD de activos. |
| `/users`, `/locations`, `/levels`, `/subjects`, `/software` | Principalmente administrador | Gestión de datos maestros. |
| `GET /health` | Operación/proxy | Revisa consulta sencilla a Postgres. |

El prefijo `/api` se elimina en Nginx al enviar al backend. En desarrollo el frontend usa el proxy de Vite; las llamadas pasan por `services/http.ts`.

## 8. Migraciones, semillas y entorno

- `DB_SYNCHRONIZE=false` por defecto y obligatorio en producción.
- `compose.prod.yml` encadena `postgres` → `migrate` → `bootstrap-admin` → `backend` → `frontend`; cada etapa espera a la anterior.
- La tabla `migrations` registra cambios aplicados.
- `DB_MIGRATIONS_RUN` permite correr migraciones al arrancar para modos controlados.
- `seed.ts` ejecuta los seeders de demostración: ubicaciones, dispositivos, niveles, asignaturas, software y usuarios. Para cargar solo catálogos o dispositivos están `npm run seed:catalogos` y `npm run seed:dispositivos`.
- `.env.example` documenta las variables de Compose; `backend/.env.example` sirve para ejecución local.

## 9. Despliegue y operación

El compose productivo publica el frontend en `:80`. El proxy institucional termina TLS, administra dominio y certificados, y restringe el acceso.
