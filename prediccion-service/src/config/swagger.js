const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'prediccion-service API',
      version: '1.0.0',
      description:
        'Microservicio de predicción de quiebre de stock (Persona 4) — ERP Bodega Inteligente, CS2032.',
    },
    servers: [{ url: '/api', description: 'Prefijo de todas las rutas de negocio' }],
    components: {
      schemas: {
        Prediccion: {
          type: 'object',
          properties: {
            productoId: { type: 'string', example: 'P001' },
            nombreProducto: { type: 'string', example: 'Arroz extra 1kg' },
            fecha: { type: 'string', format: 'date-time' },
            stockActual: { type: 'number', example: 120 },
            ventaPromedioDiaria: { type: 'number', example: 7.29 },
            tendenciaDiaria: { type: 'number', example: 0.24 },
            diasHastaAgotamiento: { type: 'number', nullable: true, example: 16.5 },
            tiempoEntregaDias: { type: 'number', nullable: true, example: 3 },
            proveedor: { type: 'string', nullable: true, example: 'Distribuidora Central' },
            probQuiebre: { type: 'number', example: 0.1 },
            estado: {
              type: 'string',
              enum: ['verde', 'amarillo', 'rojo', 'sin_datos'],
              example: 'verde',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
});

module.exports = swaggerSpec;
