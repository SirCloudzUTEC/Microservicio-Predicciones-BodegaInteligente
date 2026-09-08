/**
 * Carga masiva de datos ficticios para cumplir el requisito de rúbrica de
 * ≥20,000 registros en al menos una colección de cada base de datos.
 *
 * Genera predicciones históricas para 60 productos sintéticos (P009–P068),
 * a propósito FUERA del rango P001–P008 que usan los mocks de
 * Inventario/Ventas/Proveedores, para no contaminar las respuestas que ve
 * el frontend/Postman al probar con los mocks reales.
 *
 * Reutiliza la función real calcularPrediccion() del módulo de forecasting
 * sobre series de ventas sintéticas (random walk con semilla
 * determinística), para que los datos generados sean coherentes con el
 * algoritmo de producción y no solo ruido aleatorio.
 *
 * Uso:
 *   npm run seed        -> inserta si el rango P009-P068 no tiene ya el mínimo esperado
 *   npm run seed:drop    -> borra el rango P009-P068 y vuelve a insertar
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Prediccion = require('../src/models/Prediccion');
const { calcularPrediccion } = require('../src/logic/forecasting');

const NUM_PRODUCTOS = 60;
const NUM_DIAS = 350;
const TAMANO_LOTE = 2000;
const PRODUCTO_ID_INICIAL = 9; // P009
const TOTAL_ESPERADO = NUM_PRODUCTOS * NUM_DIAS; // 21,000

const PROVEEDORES = ['Distribuidora Central', 'Andina Foods', 'Comercial Lima Norte', 'Grupo Bodega Sur'];
const CATEGORIAS = ['Abarrotes', 'Lácteos', 'Panadería', 'Limpieza', 'Bebidas'];

function productoIdSintetico(indice) {
  const numero = PRODUCTO_ID_INICIAL + indice;
  return `P${String(numero).padStart(3, '0')}`;
}

// PRNG determinístico (mulberry32) para que el seed sea reproducible entre corridas.
function crearGenerador(semilla) {
  let a = semilla;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genera una serie de ventas diarias con un random walk suave, siempre >= 0.
 */
function generarSerieVentas(random, dias, base) {
  const serie = [];
  let valor = base;
  for (let i = 0; i < dias; i += 1) {
    valor += (random() - 0.5) * base * 0.3;
    valor = Math.max(valor, 0);
    serie.push(Math.round(valor * 10) / 10);
  }
  return serie;
}

async function generarDocumentosProducto(indiceProducto) {
  const productoId = productoIdSintetico(indiceProducto);
  const random = crearGenerador(1000 + indiceProducto);
  const ventaBase = 5 + random() * 20; // entre 5 y 25 unidades/día en promedio
  const serieVentas = generarSerieVentas(random, NUM_DIAS + 14, ventaBase);
  const tiempoEntregaDias = 2 + Math.floor(random() * 6); // 2 a 7 días
  const proveedor = PROVEEDORES[indiceProducto % PROVEEDORES.length];
  const categoria = CATEGORIAS[indiceProducto % CATEGORIAS.length];
  const nombreProducto = `Producto sintético ${productoId} (${categoria})`;

  const capacidadReabastecimiento = ventaBase * (tiempoEntregaDias + 5);
  let stockActual = capacidadReabastecimiento;

  const documentos = [];
  const hoy = new Date();

  for (let dia = 0; dia < NUM_DIAS; dia += 1) {
    // Ventana de 14 días previos a este punto en la serie, para calcular la predicción de ese día.
    const ventanaVentas = serieVentas.slice(dia, dia + 14);
    const consumoDelDia = ventanaVentas[ventanaVentas.length - 1] || 0;

    stockActual = Math.max(stockActual - consumoDelDia, 0);
    // Reabastecimiento periódico simulando pedidos ya realizados al proveedor.
    if (stockActual < capacidadReabastecimiento * 0.25) {
      stockActual += capacidadReabastecimiento;
    }

    const resultado = calcularPrediccion({
      stockActual: Math.round(stockActual),
      ventasDiarias: ventanaVentas,
      tiempoEntregaDias,
    });

    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - (NUM_DIAS - dia));

    documentos.push({
      productoId,
      nombreProducto,
      fecha,
      stockActual: Math.round(stockActual),
      tiempoEntregaDias,
      proveedor,
      ...resultado,
    });
  }

  return documentos;
}

async function insertarEnLotes(documentos) {
  for (let i = 0; i < documentos.length; i += TAMANO_LOTE) {
    const lote = documentos.slice(i, i + TAMANO_LOTE);
    await Prediccion.insertMany(lote, { ordered: false });
    console.log(`[seed] insertados ${Math.min(i + TAMANO_LOTE, documentos.length)}/${documentos.length}`);
  }
}

async function main() {
  const forzarDrop = process.argv.includes('--drop');
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/prediccion_db';
  await mongoose.connect(uri);
  console.log(`[seed] conectado a ${uri}`);

  const rangoQuery = {
    productoId: { $gte: productoIdSintetico(0), $lte: productoIdSintetico(NUM_PRODUCTOS - 1) },
  };

  const existentes = await Prediccion.countDocuments(rangoQuery);

  if (existentes >= TOTAL_ESPERADO && !forzarDrop) {
    console.log(
      `[seed] ya hay ${existentes} documentos sintéticos (>= ${TOTAL_ESPERADO}). ` +
        'Nada que hacer. Usa --drop (npm run seed:drop) para regenerar.'
    );
    await mongoose.connection.close();
    return;
  }

  if (forzarDrop) {
    const borrados = await Prediccion.deleteMany(rangoQuery);
    console.log(`[seed] --drop: eliminados ${borrados.deletedCount} documentos sintéticos previos`);
  }

  console.log(`[seed] generando ${NUM_PRODUCTOS} productos x ${NUM_DIAS} días = ${TOTAL_ESPERADO} documentos...`);

  for (let indice = 0; indice < NUM_PRODUCTOS; indice += 1) {
    const documentos = await generarDocumentosProducto(indice);
    await insertarEnLotes(documentos);
  }

  const total = await Prediccion.countDocuments(rangoQuery);
  console.log(`[seed] listo. Total de documentos sintéticos en ${productoIdSintetico(0)}-${productoIdSintetico(NUM_PRODUCTOS - 1)}: ${total}`);

  await mongoose.connection.close();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[seed] falló:', err);
    process.exit(1);
  });
}

module.exports = { generarDocumentosProducto, productoIdSintetico, NUM_PRODUCTOS, NUM_DIAS, TOTAL_ESPERADO };
