# CLAUDE.md — Golden Fantasy Backend

## Rol de este repo
Backend/API de la tienda de bisutería artesanal Golden Fantasy (Colombia, COP). Este repo es dueño de la base de datos, la lógica de negocio y el costeo. Es consumido por un repo de **frontend separado** (`golden-fantasy-front`, Next.js) vía REST + JWT — no le sirve HTML, no sabe nada de UI.

## Reglas de negocio no obvias
- Cada producción es independiente (sin recetas fijas reutilizables). El precio de materia prima se autocompleta con el **último lote comprado** registrado, pero se guarda como **snapshot** en cada producción (no como referencia viva) — los costos históricos no deben cambiar si el precio del insumo sube después.
- El costo de mano de obra sale del SMLV, configurado 1 vez al año por el admin dueño.
- `Product.price` es un valor **fijo guardado** al publicar (viene del precio final de la producción) — no se recalcula en vivo desde la producción.
- Límite fijo de 5 unidades por producto en el carrito (v1).
- Roles: `buyer`, `admin_owner`, `admin_collaborator`. Solo `admin_owner` ve reportes de costos y configura el SMLV.
- No hay registro público de admin — el usuario `admin_owner` se crea vía seed/script, no desde un endpoint de registro.

## Fuera de alcance en v1 (no construir)
Alertas de stock, gestión completa de usuarios admin, historial de pedidos del comprador, cálculo de costo de envío, límite de cantidad configurable por producto.

## Stack
- Node.js + Express + TypeScript
- Prisma + PostgreSQL (Supabase/Neon)
- JWT propio para auth (el frontend usa NextAuth solo para su sesión de navegador; la validación real de credenciales pasa por acá)
- Mercado Pago — Checkout Pro (webhook de confirmación)
- Deploy: Railway o Render

## Comunicación con el frontend
- CORS restringido a la URL del frontend (variable de entorno `CORS_ORIGIN`) — el navegador del comprador nunca llama a este backend directo, pero igual hay que configurarlo para las llamadas servidor-a-servidor.
- `POST /auth/login` y `POST /auth/register` devuelven un JWT con `userId` + `role`.
- Todas las rutas protegidas esperan `Authorization: Bearer <token>` y verifican rol en un middleware.

## Estructura de carpetas
```
/src
  /routes (o /modules)
    /auth              → POST /login, POST /register
    /productos
    /materiales
    /producciones
    /ordenes
    /webhooks/mercadopago
  /middlewares
    auth.ts            → verifica JWT + rol
    cors.ts
  /services            → lógica de negocio, separada de las rutas
  /lib
    db.ts              → cliente Prisma
    jwt.ts             → firma/valida tokens
    mercadopago.ts
/prisma
  schema.prisma
```

## Convenciones de código
Sigue el skill `backend-structure` para arquitectura por capas (ruta delgada → servicio → acceso a datos), límite de 130 líneas por archivo, y organización de carpetas. Se carga automáticamente cuando la tarea sea de estructura del backend.
