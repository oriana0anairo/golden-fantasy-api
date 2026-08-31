# Golden Fantasy — API (backend)

Backend de la tienda de bisutería artesanal **Golden Fantasy** (Colombia, COP).
Es dueño de la base de datos, la lógica de negocio y el costeo. Lo consume el repo
de frontend `golden-fantasy-front` (Next.js) vía **REST + JWT** — ver decisión D5 del
documento de arquitectura.

**Estado: Sprint 0.** Solo hay auth (`User` + login/registro + middleware de rol).
Productos, materiales, producciones, órdenes y el webhook de Mercado Pago llegan en
épicas posteriores.

## Stack
Node.js 22 · Express 5 · TypeScript · Prisma 7 + PostgreSQL (Supabase) · JWT · Zod

## Puesta en marcha local

```bash
npm install
cp .env.example .env        # y completa los valores (ver tabla abajo)
npm run db:migrate          # crea las tablas en tu base de datos
npm run db:seed             # crea el usuario ADMIN_OWNER inicial
npm run dev                 # http://localhost:4000
```

## Variables de entorno

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `DATABASE_URL` | sí | Conexión de la app en runtime. En Supabase: **Transaction pooler**, puerto 6543. |
| `DIRECT_URL` | sí para migrar | La usa `prisma migrate`. En Supabase: **Session pooler**, puerto 5432. El transaction pooler no sirve acá (las migraciones necesitan DDL y locks). |
| `JWT_SECRET` | sí | Secreto para firmar los JWT. Mínimo 32 caracteres: `openssl rand -base64 48`. |
| `JWT_EXPIRES_IN` | no (`7d`) | Vigencia del token. |
| `PORT` | no (`4000`) | Puerto del servidor. En Railway/Render lo inyecta la plataforma. |
| `NODE_ENV` | no (`development`) | En `production` se ocultan los detalles de errores internos. |
| `CORS_ORIGIN` | no (`http://localhost:3000`) | URL(s) del frontend autorizadas, separadas por coma. |
| `ADMIN_OWNER_NAME` | solo seed | Nombre del admin dueño. |
| `ADMIN_OWNER_EMAIL` | solo seed | Correo del admin dueño. |
| `ADMIN_OWNER_PASSWORD` | solo seed | Contraseña del admin dueño (mínimo 8 caracteres). |
| `ADMIN_OWNER_RESET_PASSWORD` | no | `true` fuerza al seed a restablecer la contraseña del admin existente. Ver abajo. |

El arranque valida estas variables: si falta alguna, el proceso muere de una con un
mensaje claro en vez de fallar a mitad de una petición.

## Endpoints disponibles

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | — | Healthcheck (no toca la base de datos). |
| `POST` | `/auth/register` | — | Registro público. **Siempre crea rol `BUYER`.** |
| `POST` | `/auth/login` | — | Login de cualquier rol. Devuelve JWT. |
| `GET` | `/auth/me` | Bearer | Verifica que el token siga siendo válido. |

`register` y `login` devuelven:

```json
{
  "token": "<jwt con userId y role>",
  "user": { "id": "...", "name": "...", "email": "...", "role": "BUYER" }
}
```

Los errores siempre tienen la misma forma: `{ "error": { "code", "message", "details?" } }`.

### Probar localmente

```bash
# Registrar un comprador
curl -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana Compradora","email":"ana@ejemplo.com","password":"micontrasena123"}'

# Login (sirve igual para el admin creado por el seed)
curl -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@ejemplo.com","password":"micontrasena123"}'

# Usar el token en una ruta protegida
curl http://localhost:4000/auth/me -H "Authorization: Bearer <TOKEN>"
```

## Proteger rutas futuras

```ts
import { requireAuth, requireRole } from '../middlewares';

router.get('/reportes', requireAuth, requireRole('ADMIN_OWNER'), handler);
// dentro del handler: req.auth = { userId, role }
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor en modo watch. |
| `npm run build` | `prisma generate` + compilación TypeScript a `dist/`. |
| `npm start` | Corre lo compilado (lo que usa el hosting). |
| `npm run typecheck` | TypeScript sin emitir. |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo. |
| `npm run db:deploy` | Aplica migraciones existentes (producción). |
| `npm run db:seed` | Crea/actualiza el `ADMIN_OWNER`. |
| `npm run db:studio` | Explorador visual de la base de datos. |

## Deploy (Railway o Render)

Lo que hay que hacer **manualmente en la plataforma**:

1. Conectar este repo y elegir la rama.
2. Comandos: build `npm ci --include=dev && npm run build`, start `npm start`.
   El `--include=dev` es obligatorio: con `NODE_ENV=production` npm omite las
   devDependencies, y el build necesita TypeScript y los `@types` para compilar.
   (El `.npmrc` del repo ya fuerza esto, el flag lo deja explícito.)
3. Cargar las variables de entorno de la tabla de arriba (`DATABASE_URL`, `DIRECT_URL`,
   `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`). No definas `PORT`: lo inyecta
   la plataforma.
4. Healthcheck en `/health`.
5. Aplicar migraciones: en Render queda automático con `preDeployCommand` (ver
   `render.yaml`); en Railway agrégalo como comando de pre-deploy o corre
   `npm run db:deploy` a mano apuntando a la base de producción.
6. Cargar `ADMIN_OWNER_NAME`, `ADMIN_OWNER_EMAIL` y `ADMIN_OWNER_PASSWORD`: el
   seed corre dentro del build y crea el admin dueño en el primer deploy. No
   hace falta shell ni clonar el repo (ver abajo).
7. Cuando el frontend esté desplegado en Vercel, poner esa URL en `CORS_ORIGIN`.

## El admin dueño se crea en el deploy

No hay registro público de admin, y el plan free de Render no tiene shell ni jobs,
así que el seed va dentro del `buildCommand`. Es seguro que corra en cada deploy:

| Situación | Qué hace |
|---|---|
| Sin `ADMIN_OWNER_EMAIL` ni `ADMIN_OWNER_PASSWORD` | No hace nada y termina bien (no rompe el build). |
| El admin no existe | Lo crea con rol `ADMIN_OWNER`. |
| El admin ya existe | **No lo toca.** No le pisa la contraseña en cada deploy. |
| El admin existe y `ADMIN_OWNER_RESET_PASSWORD=true` | Restablece la contraseña a la de la variable. |

Sólo una de las dos variables cargadas (por ejemplo el correo sin la contraseña) es
un error de configuración y falla el build a propósito, para que no pase inadvertido.

**Si olvidas la contraseña del admin:** pon `ADMIN_OWNER_PASSWORD` con la nueva y
`ADMIN_OWNER_RESET_PASSWORD=true`, lanza un deploy, y después quita esa segunda
variable para que el siguiente deploy no vuelva a restablecerla.

Para dejar de crear/tocar el admin, quita **ambas** variables (`ADMIN_OWNER_EMAIL`
y `ADMIN_OWNER_PASSWORD`) del panel.

## Dónde sacar las cadenas de conexión de Supabase

Panel de Supabase → botón **Connect** (arriba) → pestaña **ORMs**. Ahí aparecen las dos
que necesitas, ya armadas:

- **Transaction pooler** (puerto 6543) → `DATABASE_URL`
- **Session pooler** (puerto 5432) → `DIRECT_URL`

Reemplaza `[YOUR-PASSWORD]` por la contraseña de la base de datos (la de *Database
Settings*, no la de tu cuenta de Supabase). El usuario tiene la forma
`postgres.<project-ref>`, no `postgres` a secas.

> No uses la opción **Direct connection** (`db.<ref>.supabase.co`): es solo IPv6 y
> Render no la alcanza. Por eso `DIRECT_URL` apunta al *session pooler*, que sí es IPv4.

## Errores frecuentes de deploy

| Error | Causa |
|---|---|
| `FATAL: (ENOTFOUND) tenant/user postgres.xxxx not found` | La cadena de conexión todavía tiene el placeholder del ejemplo, o el usuario no lleva el `.<project-ref>`. |
| `password authentication failed` | La contraseña de la cadena no es la de la base de datos, o tiene caracteres especiales sin escapar (URL-encode `@`, `#`, `/`, `?`). |
| `Could not find a declaration file for module 'express'` | Se instaló sin devDependencies. El build necesita `npm ci --include=dev` (ya cubierto por el `.npmrc` del repo). |
| Migraciones que se cuelgan o fallan por locks | `DIRECT_URL` apunta al transaction pooler (6543) en vez del session pooler (5432). |
