# Golden Fantasy — API (backend)

Backend de la tienda de bisutería artesanal **Golden Fantasy** (Colombia, COP).
Es dueño de la base de datos, la lógica de negocio y el costeo. Lo consume el repo
de frontend `golden-fantasy-front` (Next.js) vía **REST + JWT** — ver decisión D5 del
documento de arquitectura.

**Estado: Épica 2.** Auth (`User` + login/registro + middleware de rol) y el
catálogo público (`Product`) de solo lectura. Materiales, producciones, órdenes y
el webhook de Mercado Pago llegan en épicas posteriores.

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
| `MERCADOPAGO_ACCESS_TOKEN` | para pagar | Token de Mercado Pago. Sin él la API vive, pero `POST /ordenes` responde `503`. |
| `MERCADOPAGO_WEBHOOK_SECRET` | no | Si se define, el webhook exige firma válida (`x-signature`). |
| `MERCADOPAGO_API_URL` | no | Solo para pruebas: apunta el cliente a un doble en vez de Mercado Pago. |
| `FRONTEND_URL` | no | URL del frontend para las `back_urls`. Por defecto, el primer `CORS_ORIGIN`. |
| `PUBLIC_URL` | no | URL pública de este backend para el `notification_url`. En Render sale de `RENDER_EXTERNAL_URL`. |

El arranque valida estas variables: si falta alguna, el proceso muere de una con un
mensaje claro en vez de fallar a mitad de una petición.

## Endpoints disponibles

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | — | Healthcheck (no toca la base de datos). |
| `POST` | `/auth/register` | — | Registro público. **Siempre crea rol `BUYER`.** |
| `POST` | `/auth/login` | — | Login de cualquier rol. Devuelve JWT. |
| `GET` | `/auth/me` | Bearer | Verifica que el token siga siendo válido. |
| `GET` | `/productos` | — | Catálogo público. Filtros opcionales `?category=` y `?search=` (nombre o categoría, sin distinguir mayúsculas). Solo devuelve piezas `PUBLISHED` con unidades disponibles. |
| `GET` | `/productos/:id` | — | Detalle de una pieza. `404` si no existe, si está en `DRAFT`, o si ya no quedan unidades. |

| `POST` | `/ordenes` | Bearer | Crea el pedido y la preferencia de pago. Devuelve `{ orderId, initPoint }`. |
| `POST` | `/webhooks/mercadopago` | — | Lo llama Mercado Pago para confirmar el pago. |

Cada pieza trae `photos` (arreglo ordenado: la primera es la principal, el resto
son las miniaturas del detalle) y `stockQuantity`. Una pieza sin fotos devuelve
`[]`, nunca `null`.

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

## Flujo de pago (épica 3)

1. El comprador (con sesión) manda su carrito a `POST /ordenes`. El backend
   **ignora los precios que lleguen del cliente**: relee cada `Product`, valida
   que esté publicado y que la cantidad no pase de `min(5, stockQuantity)`, y
   calcula el total. Si algo falla responde `400` con el detalle por producto y
   no crea nada.
2. Se crea el `Order` en `PENDING` y se pide la preferencia a Mercado Pago.
3. El frontend redirige al comprador al `initPoint`.
4. Mercado Pago llama a `POST /webhooks/mercadopago`. El backend **consulta el
   pago contra la API** (nunca cree en el cuerpo de la notificación), y si está
   aprobado pasa el pedido a `PAID` y descuenta stock, todo en una transacción.
5. Un reintento de la misma notificación no descuenta stock dos veces: la
   transición solo se aplica si el pedido sigue en `PENDING`.

El pedido **nunca** pasa a `PAID` desde el navegador: las `back_urls` solo sirven
para mostrarle algo al comprador.

### Rutas que debe crear el frontend

| Resultado | Ruta |
|---|---|
| Pago aprobado | `{FRONTEND_URL}/checkout/exito` |
| Pago rechazado | `{FRONTEND_URL}/checkout/fallo` |
| Pago pendiente | `{FRONTEND_URL}/checkout/pendiente` |

## Integridad de los pedidos

`Order.buyerId` apunta a `User.id` y `OrderItem.productId` a `Product.id`, ambas
con `ON DELETE RESTRICT`: no se puede borrar un usuario que tiene pedidos ni un
producto que ya se vendió. El historial de ventas no se rompe por un borrado.
(Borrar un pedido sí arrastra sus ítems, con `CASCADE`.)

Antes de desplegar la migración que crea estas llaves conviene revisar que no
haya filas apuntando a registros inexistentes:

```sql
-- Órdenes cuyo comprador ya no existe
select o.id, o."buyerId" from orders o
  left join users u on u.id = o."buyerId" where u.id is null;

-- Ítems cuyo producto ya no existe
select i.id, i."orderId", i."productId" from order_items i
  left join products p on p.id = i."productId" where p.id is null;
```

Si alguna devuelve filas, la migración **se detiene sola** con la lista exacta y
sin modificar nada. En ese caso: corrige esas filas y, como Prisma marca la
migración como fallida, ejecuta una vez

```bash
npx prisma migrate resolve --rolled-back 20260911152306_add_order_foreign_keys
```

antes de volver a desplegar.
