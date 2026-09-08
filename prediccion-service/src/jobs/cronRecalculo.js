const cron = require('node-cron');
const { ejecutarRecalculoGlobal } = require('../controllers/predicciones.controller');

/**
 * Programa el recálculo diario de predicciones para todos los productos.
 * Horario configurable por CRON_RECALCULO (formato cron estándar) y
 * CRON_TZ (zona horaria), con defaults de 3am hora de Lima.
 */
function iniciarCronRecalculo() {
  const expresion = process.env.CRON_RECALCULO || '0 3 * * *';
  const zonaHoraria = process.env.CRON_TZ || 'America/Lima';

  cron.schedule(
    expresion,
    async () => {
      try {
        const r = await ejecutarRecalculoGlobal();
        console.log(
          `[cron] recálculo global: ${r.calculados}/${r.total} ok, ${r.fallidos.length} fallidos`
        );
      } catch (err) {
        console.error('[cron] fallo el recálculo global:', err.message);
      }
    },
    { timezone: zonaHoraria }
  );

  console.log(`[cron] recálculo programado con expresión "${expresion}" (${zonaHoraria})`);
}

module.exports = { iniciarCronRecalculo };
