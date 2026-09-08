const Prediccion = require('../models/Prediccion');
const { calcularPrediccion } = require('../logic/forecasting');
const {
  obtenerListaProductos,
  obtenerStockProducto,
  obtenerHistorialVentas,
  obtenerTiempoEntrega,
} = require('../services/httpClients');

/**
 * Calcula y persiste la predicción de un producto, consultando en paralelo
 * a Inventario, Ventas y Proveedores.
 */
async function calcularParaProducto(productoId) {
  const [stockInfo, ventasInfo, proveedorInfo] = await Promise.all([
    obtenerStockProducto(productoId),
    obtenerHistorialVentas(productoId, 14),
    obtenerTiempoEntrega(productoId).catch(() => null), // proveedor es opcional
  ]);

  const cantidadesDiarias = (ventasInfo.historial || []).map((h) => h.cantidad);

  const resultado = calcularPrediccion({
    stockActual: stockInfo.stockActual,
    ventasDiarias: cantidadesDiarias,
    tiempoEntregaDias: proveedorInfo ? proveedorInfo.tiempoEntregaDias : null,
  });

  const prediccion = await Prediccion.create({
    productoId,
    nombreProducto: stockInfo.nombre,
    stockActual: stockInfo.stockActual,
    tiempoEntregaDias: proveedorInfo ? proveedorInfo.tiempoEntregaDias : null,
    proveedor: proveedorInfo ? proveedorInfo.proveedor : null,
    ...resultado,
  });

  return prediccion;
}

// POST /api/predicciones/:productoId/calcular
async function calcular(req, res) {
  const { productoId } = req.params;
  try {
    const prediccion = await calcularParaProducto(productoId);
    res.status(201).json(prediccion);
  } catch (err) {
    manejarErrorDependencia(res, err, productoId);
  }
}

// POST /api/predicciones/calcular-todos
async function calcularTodos(req, res) {
  try {
    const productos = await obtenerListaProductos();
    const resultados = await Promise.allSettled(
      productos.map((p) => calcularParaProducto(p.id))
    );

    const ok = resultados.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const fallidos = resultados
      .map((r, i) => ({ r, id: productos[i] && productos[i].id }))
      .filter(({ r }) => r.status === 'rejected')
      .map(({ r, id }) => ({ productoId: id, error: r.reason.message }));

    res.status(207).json({
      total: productos.length,
      calculados: ok.length,
      fallidos,
      predicciones: ok,
    });
  } catch (err) {
    res.status(502).json({
      error: 'No se pudo obtener la lista de productos desde Inventario',
      detalle: err.message,
    });
  }
}

// GET /api/predicciones/:productoId
async function obtenerUltima(req, res) {
  const { productoId } = req.params;
  const prediccion = await Prediccion.findOne({ productoId }).sort({ fecha: -1 });
  if (!prediccion) {
    return res.status(404).json({ error: `Sin predicciones para el producto ${productoId}` });
  }
  res.json(prediccion);
}

// GET /api/predicciones?estado=rojo
async function listarUltimas(req, res) {
  const { estado } = req.query;

  const pipeline = [
    { $sort: { productoId: 1, fecha: -1 } },
    {
      $group: {
        _id: '$productoId',
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
  ];

  if (estado) {
    pipeline.push({ $match: { estado } });
  }

  const predicciones = await Prediccion.aggregate(pipeline);
  res.json(predicciones);
}

// GET /api/predicciones/:productoId/historial
async function historial(req, res) {
  const { productoId } = req.params;
  const limite = Number(req.query.limite) || 30;
  const registros = await Prediccion.find({ productoId })
    .sort({ fecha: -1 })
    .limit(limite);
  res.json(registros);
}

function manejarErrorDependencia(res, err, productoId) {
  if (err.response) {
    // El microservicio dependiente respondió con error (ej. 404 producto no existe)
    return res.status(err.response.status).json({
      error: `Error consultando dependencia para el producto ${productoId}`,
      detalle: err.response.data,
    });
  }
  // La dependencia no respondió (caída / timeout)
  return res.status(502).json({
    error: `No se pudo calcular la predicción para ${productoId}: dependencia no disponible`,
    detalle: err.message,
  });
}

module.exports = {
  calcular,
  calcularTodos,
  obtenerUltima,
  listarUltimas,
  historial,
};
