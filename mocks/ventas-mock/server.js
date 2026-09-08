const express = require('express');
const { historiales } = require('./data');

const app = express();
const PORT = process.env.PORT || 4002;

app.get('/health', (req, res) => res.json({ status: 'ok', servicio: 'ventas-mock' }));

// GET /productos/:id/historial?dias=14 -> ventas diarias de los últimos N días
app.get('/productos/:id/historial', (req, res) => {
  const serie = historiales[req.params.id];
  if (!serie) {
    return res.status(404).json({ error: `Sin historial de ventas para ${req.params.id}` });
  }

  const dias = Math.min(Number(req.query.dias) || 14, serie.length);
  const cantidades = serie.slice(serie.length - dias);

  const hoy = new Date();
  const historial = cantidades.map((cantidad, i) => {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - (dias - 1 - i));
    return { fecha: fecha.toISOString().slice(0, 10), cantidad };
  });

  res.json({ productoId: req.params.id, historial });
});

app.listen(PORT, () => {
  console.log(`[ventas-mock] escuchando en puerto ${PORT}`);
});
