const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const prediccionesRoutes = require('./routes/predicciones.routes');

function crearApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    const mongoConectado = mongoose.connection.readyState === 1; // 1 = connected
    res.status(mongoConectado ? 200 : 503).json({
      status: mongoConectado ? 'ok' : 'degradado',
      servicio: 'prediccion-service',
      mongo: mongoose.STATES[mongoose.connection.readyState],
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
