-- Llaves foráneas que faltaban: Order.buyerId -> User.id y
-- OrderItem.productId -> Product.id.
--
-- Antes de crearlas se revisa que no haya filas apuntando a registros que ya
-- no existen. Si las hay, la migración se detiene con la lista exacta en vez
-- de fallar con un error de Postgres sin contexto. Todo corre dentro de una
-- transacción, así que al detenerse no queda nada a medias ni se borra nada.
DO $guardia$
DECLARE
  ordenes_huerfanas text;
  items_huerfanos   text;
BEGIN
  SELECT string_agg(format('orden %s (buyerId %s)', o.id, o."buyerId"), E'\n    ')
    INTO ordenes_huerfanas
    FROM orders o
    LEFT JOIN users u ON u.id = o."buyerId"
   WHERE u.id IS NULL;

  SELECT string_agg(format('item %s de la orden %s (productId %s)', i.id, i."orderId", i."productId"), E'\n    ')
    INTO items_huerfanos
    FROM order_items i
    LEFT JOIN products p ON p.id = i."productId"
   WHERE p.id IS NULL;

  IF ordenes_huerfanas IS NOT NULL OR items_huerfanos IS NOT NULL THEN
    RAISE EXCEPTION E'No se crearon las llaves foraneas: hay filas que apuntan a registros inexistentes.\n\n  Ordenes sin comprador:\n    %\n\n  Items sin producto:\n    %\n\n  No se modifico ni borro nada. Revisa esas filas y vuelve a desplegar.',
      coalesce(ordenes_huerfanas, '(ninguna)'),
      coalesce(items_huerfanos, '(ninguno)');
  END IF;
END
$guardia$;

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
