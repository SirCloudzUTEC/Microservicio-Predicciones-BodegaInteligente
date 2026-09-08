// Historial de ventas diarias ficticio (últimos 14 días, oldest -> newest)
// por producto, solo para probar Predicción end-to-end mientras Integrante 2
// construye el microservicio real de Ventas. Se armaron a mano con distintos
// patrones (estable, creciente, bajo volumen) para poder ver los 3 colores
// del semáforo al probar.
const historiales = {
  P001: [3, 4, 4, 5, 3, 4, 5, 4, 3, 4, 5, 4, 3, 4], // estable
  P002: [4, 5, 5, 6, 6, 7, 6, 7, 8, 7, 8, 9, 8, 9], // creciente
  P003: [5, 4, 5, 6, 5, 4, 5, 6, 5, 4, 5, 6, 5, 5], // estable, poco stock -> riesgo
  P004: [5, 6, 6, 7, 6, 7, 8, 7, 8, 7, 8, 9, 8, 9], // creciente, poco stock -> riesgo alto
  P005: [2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1], // bajo volumen, harto stock
  P006: [5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12], // creciente fuerte
  P007: [2, 3, 3, 2, 3, 4, 3, 3, 4, 3, 4, 3, 4, 3], // estable, poquísimo stock -> riesgo alto
  P008: [2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2], // estable, harto stock
};

module.exports = { historiales };
