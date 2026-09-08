const { Router } = require('express');
const ctrl = require('../controllers/predicciones.controller');
const { asyncHandler } = require('../utils/asyncHandler');

const router = Router();

/**
 * @swagger
 * /predicciones/{productoId}/calcular:
 *   post:
 *     summary: Recalcula y guarda la predicción de un producto
 *     tags: [Predicciones]
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *           example: P001
 *     responses:
 *       201:
 *         description: Predicción calculada y guardada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prediccion'
 *       502:
 *         description: Dependencia (Inventario/Ventas/Proveedores) no disponible o con datos inválidos
 */
router.post('/predicciones/:productoId/calcular', asyncHandler(ctrl.calcular));

/**
 * @swagger
 * /predicciones/calcular-todos:
 *   post:
 *     summary: Recalcula la predicción de todos los productos (pensado para correr por cron)
 *     tags: [Predicciones]
 *     responses:
 *       207:
 *         description: Resultado multi-status con los productos calculados y los fallidos
 *       502:
 *         description: No se pudo obtener la lista de productos desde Inventario
 */
router.post('/predicciones/calcular-todos', asyncHandler(ctrl.calcularTodos));

/**
 * @swagger
 * /predicciones/{productoId}:
 *   get:
 *     summary: Última predicción guardada de un producto
 *     tags: [Predicciones]
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *           example: P001
 *     responses:
 *       200:
 *         description: Última predicción del producto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prediccion'
 *       404:
 *         description: Sin predicciones guardadas para ese producto
 */
router.get('/predicciones/:productoId', asyncHandler(ctrl.obtenerUltima));

/**
 * @swagger
 * /predicciones/{productoId}/historial:
 *   get:
 *     summary: Historial de predicciones de un producto (para graficar tendencia)
 *     tags: [Predicciones]
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *           example: P001
 *       - in: query
 *         name: limite
 *         required: false
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Cantidad máxima de registros a devolver, más recientes primero
 *     responses:
 *       200:
 *         description: Lista de predicciones históricas del producto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prediccion'
 */
router.get('/predicciones/:productoId/historial', asyncHandler(ctrl.historial));

/**
 * @swagger
 * /predicciones:
 *   get:
 *     summary: Última predicción de todos los productos (consumido por Alertas y el frontend)
 *     tags: [Predicciones]
 *     parameters:
 *       - in: query
 *         name: estado
 *         required: false
 *         schema:
 *           type: string
 *           enum: [verde, amarillo, rojo, sin_datos]
 *         description: Filtra solo los productos en ese estado de semáforo
 *     responses:
 *       200:
 *         description: Última predicción de cada producto (opcionalmente filtrada por estado)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prediccion'
 */
router.get('/predicciones', asyncHandler(ctrl.listarUltimas));

module.exports = router;
