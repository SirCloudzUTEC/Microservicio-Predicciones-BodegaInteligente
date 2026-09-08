// Datos ficticios solo para probar Predicción end-to-end mientras
// Integrante 1 construye el microservicio real de Inventario.
const productos = [
  { id: 'P001', nombre: 'Arroz extra 1kg', categoria: 'Abarrotes', stockActual: 120 },
  { id: 'P002', nombre: 'Aceite vegetal 1L', categoria: 'Abarrotes', stockActual: 45 },
  { id: 'P003', nombre: 'Leche evaporada', categoria: 'Lácteos', stockActual: 18 },
  { id: 'P004', nombre: 'Pan de molde', categoria: 'Panadería', stockActual: 5 },
  { id: 'P005', nombre: 'Detergente 800g', categoria: 'Limpieza', stockActual: 60 },
  { id: 'P006', nombre: 'Gaseosa 1.5L', categoria: 'Bebidas', stockActual: 30 },
  { id: 'P007', nombre: 'Huevos x30', categoria: 'Abarrotes', stockActual: 8 },
  { id: 'P008', nombre: 'Papel higiénico x4', categoria: 'Limpieza', stockActual: 25 },
];

module.exports = { productos };
