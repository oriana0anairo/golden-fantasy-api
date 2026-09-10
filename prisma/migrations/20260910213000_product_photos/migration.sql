-- `imageUrl` (una sola foto) pasa a `photos` (arreglo ordenado): el modal de
-- detalle (wireframe 8.5) necesita foto principal + miniaturas.
-- No se pierde la foto que ya tenía cada pieza: queda como primera del arreglo.

-- El DEFAULT es solo para rellenar las filas que ya existen con un arreglo
-- vacío en vez de NULL; después se quita, porque el modelo no lo declara.
ALTER TABLE "products" ADD COLUMN "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "products"
SET "photos" = ARRAY["imageUrl"]
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';

ALTER TABLE "products" ALTER COLUMN "photos" DROP DEFAULT;
ALTER TABLE "products" DROP COLUMN "imageUrl";
