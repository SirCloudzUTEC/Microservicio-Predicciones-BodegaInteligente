const mongoose = require('mongoose');

const PrediccionSchema = new mongoose.Schema(
  {
    productoId: { type: String, required: true, index: true },
    nombreProducto: { type: String },
    fecha: { type: Date, default: Date.now, index: true },

    stockActual: { type: Number, required: true },
    ventaPromedioDiaria: { type: Number, required: true },
    tendenciaDiaria: { type: Number, default: 0 },
    diasHastaAgotamiento: { type: Number, default: null },

    tiempoEntregaDias: { type: Number, default: null },
    proveedor: { type: String, default: null },

    probQuiebre: { type: Number, required: true },
    estado: {
      type: String,
      enum: ['verde', 'amarillo', 'rojo', 'sin_datos'],
      required: true,
    },
  },
  { timestamps: true }
);

// Índice compuesto: consultas frecuentes son "última predicción por producto"
PrediccionSchema.index({ productoId: 1, fecha: -1 });

module.exports = mongoose.model('Prediccion', PrediccionSchema);
