const { Router } = require('express');
const ctrl = require('../controllers/predicciones.controller');

const router = Router();

// Recalcular predicción de un producto puntual
router.post('/predicciones/:productoId/calcular', ctrl.calcular);

// Recalcular predicción de todos los productos (batch, usado por un cron/job)
router.post('/predicciones/calcular-todos', ctrl.calcularTodos);

// Última predicción de un producto
router.get('/predicciones/:productoId', ctrl.obtenerUltima);

// Historial de predicciones de un producto (para graficar tendencia en el dashboard)
router.get('/predicciones/:productoId/historial', ctrl.historial);

// Última predicción de TODOS los productos (lo que consume el microservicio de Alertas y el frontend)
router.get('/predicciones', ctrl.listarUltimas);

module.exports = router;
