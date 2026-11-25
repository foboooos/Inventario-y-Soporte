# Operación de PostgreSQL en producción

## Ensayo aislado de despliegue

`compose.staging.yml` extiende el despliegue de producción con imágenes y volumen separados. Publica la web solo en `127.0.0.1:18080`; PostgreSQL permanece dentro de la red de Compose. El proyecto y volumen de staging no deben reutilizar los nombres de producción.

Credenciales temporales en variables de entorno:

```powershell
$randomBytes = [byte[]]::new(32)
[Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
$env:POSTGRES_USER = 'staging'
$env:POSTGRES_PASSWORD = [Convert]::ToHexString($randomBytes)
[Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
$env:JWT_SECRET = [Convert]::ToBase64String($randomBytes)
$env:POSTGRES_DB = 'inventario_staging'
# Contraseña inicial del administrador base (RUT sin puntos).
$env:SYS_ADMIN_PASSWORD = 'RUT_SIN_PUNTOS_DEL_ADMIN'
$env:SYS_ADMIN_NOMBRE = 'Administrador'
$env:JWT_EXPIRES_IN = '1d'
$env:CORS_ORIGIN = ''

docker compose -p inventario-soporte-staging-20261109 -f compose.prod.yml -f compose.staging.yml config --quiet
docker compose -p inventario-soporte-staging-20261109 -f compose.prod.yml -f compose.staging.yml up -d --build
```

Verifica que `migrate` y `bootstrap-admin` terminen con código 0 y que `backend` y `frontend` estén healthy. Prueba `http://127.0.0.1:18080/` y `http://127.0.0.1:18080/health`. Para datos de demostración, ejecuta el seed solo en staging: poda los usuarios fuera de su padrón.

```powershell
docker compose -p inventario-soporte-staging-20261109 -f compose.prod.yml -f compose.staging.yml exec -e NODE_ENV=development backend node dist/seed.js
```

Cierra el ensayo con:

```powershell
docker compose -p inventario-soporte-staging-20261109 -f compose.prod.yml -f compose.staging.yml down --volumes --rmi all
```

Elimina contenedores, volumen e imágenes con tag `staging-20261109`. No usar con el proyecto de producción.

## Copia lógica y simulacro de restauración

El formato custom de `pg_dump` permite comprobar el archivo con `pg_restore -l` y restaurarlo en otra base. Usa una ruta de respaldo fuera del repositorio y protégela con cifrado y permisos restrictivos.

```powershell
$composeArgs = @('-p', 'inventario-soporte-staging-20261109', '-f', 'compose.prod.yml', '-f', 'compose.staging.yml')
$backupPath = Join-Path $env:TEMP 'inventario-staging.dump'

docker compose @composeArgs exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/inventario-staging.dump'
docker compose @composeArgs cp postgres:/tmp/inventario-staging.dump $backupPath
docker compose @composeArgs exec -T postgres pg_restore -l /tmp/inventario-staging.dump
docker compose @composeArgs exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" inventario_restore_drill'
docker compose @composeArgs exec -T postgres sh -c 'pg_restore --exit-on-error --single-transaction --no-owner --no-privileges -U "$POSTGRES_USER" -d inventario_restore_drill /tmp/inventario-staging.dump'
docker compose @composeArgs exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d inventario_restore_drill -Atc "SELECT (SELECT count(*) FROM usuarios), (SELECT count(*) FROM inventario), (SELECT count(*) FROM tickets_soporte);"'
```

Compara esos conteos con la base de staging y comprueba que el backend puede consultar la base restaurada. La restauración se hace en `inventario_restore_drill`; no uses `--clean`, no restaures sobre la base original y no reutilices el volumen productivo. Tras guardar el resultado del simulacro, elimina solo la base temporal creada por el ensayo.

## Política inicial recomendada

- Copia lógica diaria, con alerta si no se genera o no supera `pg_restore -l`.
- Cifrado antes de transferirla a almacenamiento externo al host de PostgreSQL.
- Retención inicial: 14 copias diarias, 8 semanales y 12 mensuales.
- Objetivo inicial: RPO máximo de 24 horas y RTO máximo de 4 horas; validar que sean aceptables para el colegio.
- Simulacro de restauración trimestral y después de cambios importantes de esquema.
- Mantener una copia antes de cada despliegue que incluya migraciones.

Pendiente de definir en la infraestructura de despliegue: almacenamiento externo, credenciales del proveedor y programación de las copias.
