const axios = require('axios');

/**
 * URLs configurables por variable de entorno. Por defecto apuntan a los
 * mocks incluidos en este mismo entregable (docker-compose). El día que
 * Integrante 1, 2 y 3 tengan sus microservicios reales desplegados, solo
 * hay que cambiar estas 3 variables de entorno (INVENTARIO_URL, VENTAS_URL,
 * PROVEEDORES_URL) — el resto del código no cambia, siempre que el
 * contrato de los endpoints se respete (ver README).
 */
const inventarioApi = axios.create({
  baseURL: process.env.INVENTARIO_URL || 'http://localhost:4001',
  timeout: 5000,
});

const ventasApi = axios.create({
  baseURL: process.env.VENTAS_URL || 'http://localhost:4002',
  timeout: 5000,
});

const proveedoresApi = axios.create({
  baseURL: process.env.PROVEEDORES_URL || 'http://localhost:4003',
  timeout: 5000,
});

/** GET /productos -> [{ id, nombre, categoria, stockActual }, ...] */
async function obtenerListaProductos() {
  const { data } = await inventarioApi.get('/productos');
  return data;
}

/** GET /productos/:id/stock -> { productoId, nombre, stockActual } */
async function obtenerStockProducto(productoId) {
  const { data } = await inventarioApi.get(`/productos/${productoId}/stock`);
  return data;
}

/** GET /productos/:id/historial?dias=14 -> { productoId, historial: [{fecha, cantidad}] } */
async function obtenerHistorialVentas(productoId, dias = 14) {
  const { data } = await ventasApi.get(`/productos/${productoId}/historial`, {
    params: { dias },
  });
  return data;
}

/** GET /productos/:id/tiempo-entrega -> { productoId, proveedor, tiempoEntregaDias } */
async function obtenerTiempoEntrega(productoId) {
  const { data } = await proveedoresApi.get(`/productos/${productoId}/tiempo-entrega`);
  return data;
}

module.exports = {
  obtenerListaProductos,
  obtenerStockProducto,
  obtenerHistorialVentas,
  obtenerTiempoEntrega,
};
