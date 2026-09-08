const mongoose = require('mongoose');

async function conectarMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/prediccion_db';

  mongoose.connection.on('connected', () => {
    console.log(`[mongo] conectado a ${uri}`);
  });
  mongoose.connection.on('error', (err) => {
    console.error('[mongo] error de conexión:', err.message);
  });

  await mongoose.connect(uri);
}

module.exports = { conectarMongo };
