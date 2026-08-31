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
| `DATABASE_URL` | sí | Conexión que usa la app en runtime. En Supabase, la del **pooler** (puerto 6543). |
| `DIRECT_URL` | sí para migrar | Conexión **directa** (puerto 5432). La usa `prisma migrate`; el pooler no soporta DDL. |
| `JWT_SECRET` | sí | Secreto para firmar los JWT. Mínimo 32 caracteres: `openssl rand -base64 48`. |
| `JWT_EXPIRES_IN` | no (`7d`) | Vigencia del token. |
| `PORT` | no (`4000`) | Puerto del servidor. En Railway/Render lo inyecta la plataforma. |
| `NODE_ENV` | no (`development`) | En `production` se ocultan los detalles de errores internos. |
| `CORS_ORIGIN` | no (`http://localhost:3000`) | URL(s) del frontend autorizadas, separadas por coma. |
| `ADMIN_OWNER_NAME` | solo seed | Nombre del admin dueño. |
| `ADMIN_OWNER_EMAIL` | solo seed | Correo del admin dueño. |
| `ADMIN_OWNER_PASSWORD` | solo seed | Contraseña del admin dueño (mínimo 8 caracteres). |

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
6. El seed del admin dueño se corre **una sola vez**, a mano, con las variables
   `ADMIN_OWNER_*` apuntando a la base de producción.
7. Cuando el frontend esté desplegado en Vercel, poner esa URL en `CORS_ORIGIN`.
