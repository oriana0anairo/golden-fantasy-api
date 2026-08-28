---
name: backend-structure
description: Usar cuando se crea, organiza o refactoriza una ruta, controlador, servicio, middleware o módulo del backend, o cuando un archivo se acerca o supera las 130 líneas de código.
---

## Arquitectura por capas
Ningún endpoint mezcla HTTP, lógica de negocio y acceso a datos en un solo archivo. Estructura mínima por módulo:

```
/productos
  index.ts              → rutas: recibe la petición, valida input básico, llama al servicio, responde. Sin lógica de negocio.
  productos.service.ts  → lógica de negocio real (cálculos, reglas, orquestación). No conoce req/res de Express.
  productos.data.ts     → queries a Prisma, aisladas. El servicio llama acá, nunca a Prisma directo.
```

La ruta es solo un orquestador delgado. Si empieza a tener `if`s de negocio o cálculos, esa lógica se mueve al service.

## Carpeta raíz con index
Cada carpeta principal (`/routes`, `/services`, `/middlewares`, `/lib`) tiene un `index.ts` que reexporta su contenido, para imports limpios (`import { productosService } from '@/services'`).

## Subcarpeta para lo específico de un módulo
Si un helper, validador o util solo lo usa un módulo específico (ej. una función de cálculo exclusiva de `producciones`), va en una subcarpeta dentro de ese módulo — no en `/lib` global.

```
/producciones
  index.ts
  producciones.service.ts
  producciones.data.ts
  /calcularCostoMateriales    → util exclusivo de este módulo
    index.ts
```

## Límite de 130 líneas por archivo
Igual que en el frontend: cuando un archivo se acerca a 130 líneas, divide por responsabilidad (más funciones en el service, separar validación en su propio archivo, separar queries complejas).

## SOLID y responsabilidad única
Cada función/servicio hace una sola cosa. Evita "services" que terminan haciendo de todo (crear, validar, calcular, enviar email, notificar) — divide por responsabilidad aunque estén relacionadas.

## Parámetros: agrupar en tipos/DTOs
Si una función de servicio empieza a recibir muchos parámetros sueltos, agrúpalos en un tipo/interfaz (ej. `CrearProduccionDTO`) en vez de seguir agregando argumentos — el equivalente backend al límite de props del frontend.

## Rendimiento
- Cuidado con N+1 queries: usa `include`/`select` de Prisma para traer relaciones en una sola consulta, nunca loops que consultan la base de datos repetidamente.
- No recalcules en cada request algo que ya tienes disponible en la misma petición.
- En endpoints con varias escrituras relacionadas (ej. registrar una producción con varios materiales), usa `$transaction` de Prisma — consistencia y menos round-trips a la base de datos.

## Legible, mantenible, escalable
Nombres descriptivos, funciones cortas, sin lógica oculta en efectos secundarios difíciles de rastrear.
