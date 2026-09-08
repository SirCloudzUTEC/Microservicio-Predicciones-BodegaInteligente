require('dotenv').config();
const { crearApp } = require('./src/app');
const { conectarMongo } = require('./src/config/db');

const PORT = process.env.PORT || 4004;

async function main() {
  await conectarMongo();
  const app = crearApp();
  app.listen(PORT, () => {
    console.log(`[prediccion-service] escuchando en puerto ${PORT}`);
  });
}

main().catch((err) => {
  console.error('No se pudo iniciar prediccion-service:', err);
  process.exit(1);
});
