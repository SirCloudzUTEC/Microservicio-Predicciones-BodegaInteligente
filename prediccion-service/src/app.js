const express = require('express');
const cors = require('cors');
const prediccionesRoutes = require('./routes/predicciones.routes');

function crearApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', servicio: 'prediccion-service' });
  });

  app.use('/api', prediccionesRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Manejador de errores no controlados
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servicio de predicción' });
  });

  return app;
}

module.exports = { crearApp };
