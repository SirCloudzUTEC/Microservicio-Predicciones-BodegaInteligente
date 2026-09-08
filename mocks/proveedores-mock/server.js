const express = require('express');
const { tiemposEntrega } = require('./data');

const app = express();
const PORT = process.env.PORT || 4003;

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'proveedores-mock' }));

// GET /productos/:id/tiempo-entrega -> proveedor y días de entrega
app.get('/productos/:id/tiempo-entrega', (req, res) => {
  const info = tiemposEntrega[req.params.id];
  if (!info) {
    return res.status(404).json({ error: `Sin proveedor asignado para ${req.params.id}` });
  }
  res.json({ productoId: req.params.id, ...info });
});

app.listen(PORT, () => {
  console.log(`[proveedores-mock] escuchando en puerto ${PORT}`);
});
