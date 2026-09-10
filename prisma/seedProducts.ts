import { prisma } from '../src/lib';

/**
 * Catálogo inicial para validar el negocio (doc de producto: "menos de 50
 * SKUs"). Las fotos son de muestra hasta que el taller suba las suyas.
 *
 * Idempotente: si ya existen productos no hace nada, para no duplicar
 * catálogo en cada deploy.
 */
const PRODUCTS: Array<{
  name: string;
  category: string;
  price: number;
  description: string;
  specs: Array<[string, string]>;
}> = [
  { name: 'Pulsera Margarita', category: 'Bisutería', price: 62000, description: 'Tejida cuenta por cuenta en mostacilla checa: flores blancas, cristales rosa y remate en baño de oro con dije de corazón.', specs: [['Material', 'Mostacilla y baño de oro'], ['Medidas', '17 cm + 3 cm de extensión'], ['Cierre', 'Mosquetón dorado']] },
  { name: 'Collar Cascada', category: 'Bisutería', price: 148000, description: 'Capas de cadena plateada con caídas de cristal negro facetado. Se mueve con cada paso y pesa menos de lo que parece.', specs: [['Material', 'Plata 925 y cristal'], ['Medidas', '38 cm'], ['Estilo', 'Gargantilla en capas']] },
  { name: 'Collar Noche Dorada', category: 'Bisutería', price: 195000, description: 'Tres vueltas de ónix negro engarzado en alambre dorado, con dijes de alas y estrella. Se puede usar por separado.', specs: [['Material', 'Ónix y baño de oro 18k'], ['Medidas', '40 · 45 · 50 cm'], ['Incluye', 'Tres piezas']] },
  { name: 'Pulsera Marea', category: 'Bisutería', price: 78000, description: 'Doble hilera de cristal azul petróleo facetado, separada cuenta a cuenta con mostacilla plateada. Cierre de argolla en plata.', specs: [['Material', 'Cristal y plata 925'], ['Medidas', '18 cm'], ['Cierre', 'Argolla de resorte']] },
  { name: 'Pulsera Zafiro', category: 'Bisutería', price: 96000, description: 'Cuentas de cristal azul profundo con separadores dorados y tres dijes: trébol, corazón y hoja calada.', specs: [['Material', 'Cristal y baño de oro'], ['Medidas', '17 cm + extensión'], ['Incluye', 'Tres dijes']] },
  { name: 'Pulsera Neblina', category: 'Bisutería', price: 132000, description: 'Aguamarina y cuarzo azul en cuentas grandes, con racimo de cristales, flor de nácar y hoja dorada engastada.', specs: [['Material', 'Aguamarina y nácar'], ['Medidas', '18 cm elástica'], ['Detalle', 'Flor tallada a mano']] },
  { name: 'Pulsera Cuarzo Rosa', category: 'Bisutería', price: 68000, description: 'Cuarzo fresa alternado con perlas de río y anillos dorados; remata en una mariposa de nácar con cristal rosa.', specs: [['Material', 'Cuarzo fresa y perla'], ['Medidas', '17 cm elástica'], ['Dije', 'Mariposa de nácar']] },
  { name: 'Pulsera Rocío', category: 'Bisutería', price: 115000, description: 'Enredadera de hojas doradas con circonias rosa engastadas una por una. Liviana, para llevar del día a la noche.', specs: [['Material', 'Baño de oro y circonia'], ['Medidas', '16,5 cm'], ['Cierre', 'Broche de seguridad']] },
  { name: 'Canasto Marea', category: 'Cestería', price: 128000, description: 'Tejido en fibra de iraca teñida con tintes naturales. Base plana, asas trenzadas; sirve de frutero o de guardado en el baño.', specs: [['Material', 'Iraca teñida'], ['Medidas', '28 × 22 cm'], ['Taller', 'Sandoná, Nariño']] },
  { name: 'Mochila Semilla', category: 'Textiles', price: 320000, description: 'Tejida a una aguja durante tres semanas. Hilo de algodón encerado y cordón ajustable en cuero curtido vegetal.', specs: [['Material', 'Algodón y cuero'], ['Medidas', '24 × 30 cm'], ['Tejido', 'A una aguja']] },
  { name: 'Jarrón Solsticio', category: 'Cerámica', price: 186000, description: 'Torneado a mano y esmaltado en crema tibio. Cada pieza queda con un anillo distinto, huella del torno.', specs: [['Material', 'Gres esmaltado'], ['Medidas', '18 × 32 cm'], ['Acabado', 'Esmalte mate']] },
  { name: 'Individual Sendero', category: 'Cestería', price: 96000, description: 'Juego de cuatro individuales en caña flecha, con borde cosido a mano. Se limpian con un paño húmedo.', specs: [['Material', 'Caña flecha'], ['Medidas', '38 cm de diámetro'], ['Incluye', '4 unidades']] },
  { name: 'Cuenco Bruma', category: 'Cerámica', price: 74000, description: 'Pequeño, para salsas o para dejar los anillos en la mesa de noche. Esmalte gris rosado, apto para lavavajillas.', specs: [['Material', 'Gres esmaltado'], ['Medidas', '12 × 6 cm'], ['Acabado', 'Esmalte satinado']] },
  { name: 'Hamaca Neblina', category: 'Textiles', price: 480000, description: 'Telar de pedal en hilo de algodón crudo, con flecos anudados uno a uno. Soporta hasta 120 kg.', specs: [['Material', 'Algodón crudo'], ['Medidas', '220 × 150 cm'], ['Taller', 'San Jacinto, Bolívar']] },
  { name: 'Cuchara Guadua', category: 'Madera', price: 38000, description: 'Tallada en guadua madura y pulida con cera de abejas. El grano cambia de pieza en pieza.', specs: [['Material', 'Guadua'], ['Medidas', '30 cm'], ['Cuidado', 'Lavar a mano']] },
  { name: 'Bandeja Rocío', category: 'Madera', price: 152000, description: 'Una sola pieza de madera de nogal, ahuecada a gubia y terminada con aceite de linaza.', specs: [['Material', 'Nogal'], ['Medidas', '42 × 24 cm'], ['Acabado', 'Aceite de linaza']] },
];

/**
 * Tres fotos de muestra por pieza, estables para un mismo nombre, para que
 * el frontend pueda armar la fila de miniaturas del detalle (8.5) desde ya.
 * Para que se vean, el frontend debe permitir el host en `IMAGE_HOSTS`.
 */
function fotosDeMuestra(name: string): string[] {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');

  return [1, 2, 3].map((n) => `https://picsum.photos/seed/gf-${slug}-${n}/900/900`);
}

export async function seedProducts(): Promise<void> {
  const count = await prisma.product.count();

  if (count > 0) {
    console.log(`Catálogo ya tiene ${count} producto(s), no se vuelve a sembrar.`);
    return;
  }

  await prisma.product.createMany({
    data: PRODUCTS.map((p) => ({ ...p, photos: fotosDeMuestra(p.name) })),
  });

  console.log(`Catálogo sembrado con ${PRODUCTS.length} productos.`);
}
