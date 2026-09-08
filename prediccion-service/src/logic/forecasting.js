/**
 * Lógica de predicción de quiebre de stock.
 *
 * No usa librerías de Machine Learning ni Python: implementa una regresión
 * lineal simple (mínimos cuadrados) sobre el historial de ventas diarias
 * para estimar la tendencia de consumo, y combina eso con el stock actual
 * y el tiempo de entrega del proveedor para clasificar el riesgo en un
 * semáforo (verde / amarillo / rojo).
 */

function promedio(valores) {
  if (!valores.length) return 0;
  return valores.reduce((acc, v) => acc + v, 0) / valores.length;
}

/**
 * Regresión lineal simple por mínimos cuadrados.
 * @param {number[]} valores - serie ordenada de más antiguo a más reciente.
 * @returns {{slope: number, intercept: number}}
 */
function regresionLineal(valores) {
  const n = valores.length;
  if (n < 2) return { slope: 0, intercept: valores[0] || 0 };

  const xs = valores.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = valores.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * valores[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Calcula la predicción de quiebre de stock para un producto.
 *
 * @param {Object} params
 * @param {number} params.stockActual
 * @param {number[]} params.ventasDiarias - cantidades vendidas por día (oldest -> newest)
 * @param {number|null} params.tiempoEntregaDias - lead time del proveedor
 * @returns {Object} resultado de la predicción
 */
function calcularPrediccion({ stockActual, ventasDiarias, tiempoEntregaDias }) {
  if (!Array.isArray(ventasDiarias) || ventasDiarias.length === 0) {
    return {
      ventaPromedioDiaria: 0,
      tendenciaDiaria: 0,
      diasHastaAgotamiento: null,
      probQuiebre: 0,
      estado: 'sin_datos',
    };
  }

  const ventaPromedioDiaria = promedio(ventasDiarias);
  const { slope } = regresionLineal(ventasDiarias);

  // Consumo proyectado: promedio ajustado por la tendencia reciente,
  // nunca menor a un mínimo positivo para evitar división por cero.
  const consumoProyectado = Math.max(ventaPromedioDiaria + slope, 0.01);
  const diasHastaAgotamiento = stockActual / consumoProyectado;

  let estado = 'verde';
  let probQuiebre = 0;

  if (tiempoEntregaDias != null && tiempoEntregaDias > 0) {
    const ratio = diasHastaAgotamiento / tiempoEntregaDias;
    // ratio <= 1  -> se agota antes (o justo cuando) llega el pedido -> riesgo máximo
    // ratio >= 2  -> holgura amplia -> riesgo mínimo
    probQuiebre = clamp(1 - (ratio - 1), 0, 1);

    if (diasHastaAgotamiento <= tiempoEntregaDias) {
      estado = 'rojo';
    } else if (diasHastaAgotamiento <= tiempoEntregaDias * 1.5) {
      estado = 'amarillo';
    } else {
      estado = 'verde';
    }
  } else {
    // Sin dato de proveedor: clasificación conservadora solo por días de cobertura.
    if (diasHastaAgotamiento <= 3) estado = 'rojo';
    else if (diasHastaAgotamiento <= 7) estado = 'amarillo';
    probQuiebre = clamp(1 - diasHastaAgotamiento / 14, 0, 1);
  }

  return {
    ventaPromedioDiaria: round(ventaPromedioDiaria, 2),
    tendenciaDiaria: round(slope, 3),
    diasHastaAgotamiento: round(diasHastaAgotamiento, 1),
    probQuiebre: round(probQuiebre, 2),
    estado,
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round(v, decimals) {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

module.exports = { calcularPrediccion, regresionLineal, promedio };
