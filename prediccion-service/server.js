require('dotenv').config();
const mongoose = require('mongoose');
const { crearApp } = require('./src/app');
const { conectarMongo } = require('./src/config/db');
const { iniciarCronRecalculo } = require('./src/jobs/cronRecalculo');

const PORT = process.env.PORT || 4004;

async function main() {
  await conectarMongo();
  const app = crearApp();
  const httpServer = app.listen(PORT, () => {
    console.log(`[prediccion-service] escuchando en puerto ${PORT}`);
  });

  iniciarCronRecalculo();

  const apagar = (señal) => {
    console.log(`[prediccion-service] recibido ${señal}, cerrando...`);
    httpServer.close(async () => {
      await mongoose.connection.close();
      console.log('[prediccion-service] cierre limpio completado');
      process.exit(0);
    });
    // fallback por si el cierre de conexiones se cuelga
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('SIGINT', () => apagar('SIGINT'));
}

main().catch((err) => {
  console.error('No se pudo iniciar prediccion-service:', err);
  process.exit(1);
});
