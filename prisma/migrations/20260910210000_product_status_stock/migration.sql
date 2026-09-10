-- `available` se reemplaza por dos conceptos separados:
--   status        → si el taller la publicó (la épica 5 crea DRAFT desde una producción)
--   stockQuantity → cuántas unidades quedan (la épica de órdenes lo descuenta)
-- Se preserva el dato existente: lo vendido queda PUBLISHED con 0 unidades.

CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "products" ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'PUBLISHED';

-- Lo que ya estaba en el catálogo fue publicado: lo vendido no es un borrador,
-- es una pieza publicada con 0 unidades. Así deja de aparecer igual.
UPDATE "products"
SET "stockQuantity" = CASE WHEN "available" THEN 1 ELSE 0 END;

DROP INDEX IF EXISTS "products_available_idx";
ALTER TABLE "products" DROP COLUMN "available";

CREATE INDEX "products_status_idx" ON "products"("status");
