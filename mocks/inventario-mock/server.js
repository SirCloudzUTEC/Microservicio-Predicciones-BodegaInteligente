const express = require('express');
const { productos } = require('./data');

const app = express();
const PORT = process.env.PORT || 4001;

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'inventario-mock' }));

// GET /productos -> lista completa (la usa Predicción para "calcular-todos")
app.get('/productos', (req, res) => {
  res.json(productos);
});

// GET /productos/:id/stock -> stock actual de un producto
app.get('/productos/:id/stock', (req, res) => {
  const producto = productos.find((p) => p.id === req.params.id);
  if (!producto) {
    return res.status(404).json({ error: `Producto ${req.params.id} no existe` });
  }
  res.json({
    productoId: producto.id,
    nombre: producto.nombre,
    stockActual: producto.stockActual,
  });
});

app.listen(PORT, () => {
  console.log(`[inventario-mock] escuchando en puerto ${PORT}`);
});
