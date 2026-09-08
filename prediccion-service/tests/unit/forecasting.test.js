const { calcularPrediccion, regresionLineal, promedio } = require('../../src/logic/forecasting');

describe('forecasting.calcularPrediccion', () => {
  test('consumo estable con stock suficiente y buen tiempo de entrega -> verde', () => {
    const ventasDiarias = [10, 9, 11, 10, 10, 9, 11, 10, 10, 9, 11, 10, 10, 10];
    const resultado = calcularPrediccion({
      stockActual: 200,
      ventasDiarias,
      tiempoEntregaDias: 3,
    });

    expect(resultado.estado).toBe('verde');
    expect(resultado.ventaPromedioDiaria).toBeCloseTo(10, 0);
    expect(resultado.diasHastaAgotamiento).toBeGreaterThan(3 * 1.5);
  });

  test('consumo creciente con poco stock -> rojo', () => {
    const ventasDiarias = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const resultado = calcularPrediccion({
      stockActual: 5,
      ventasDiarias,
      tiempoEntregaDias: 5,
    });

    expect(resultado.estado).toBe('rojo');
    expect(resultado.tendenciaDiaria).toBeGreaterThan(0);
  });

  test('sin historial de ventas -> sin_datos', () => {
    const resultado = calcularPrediccion({
      stockActual: 50,
      ventasDiarias: [],
      tiempoEntregaDias: 3,
    });

    expect(resultado.estado).toBe('sin_datos');
    expect(resultado.diasHastaAgotamiento).toBeNull();
    expect(resultado.probQuiebre).toBe(0);
  });

  test('tendencia negativa (ventas cayendo) aumenta los días hasta agotamiento', () => {
    const ventasDiarias = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    const resultado = calcularPrediccion({
      stockActual: 100,
      ventasDiarias,
      tiempoEntregaDias: 3,
    });

    expect(resultado.tendenciaDiaria).toBeLessThan(0);
    expect(resultado.diasHastaAgotamiento).toBeGreaterThan(0);
  });

  test('sin tiempoEntregaDias, clasifica solo por días de cobertura', () => {
    const ventasDiarias = new Array(14).fill(10);

    const rojo = calcularPrediccion({ stockActual: 20, ventasDiarias, tiempoEntregaDias: null });
    expect(rojo.estado).toBe('rojo'); // 2 dias <= 3

    const amarillo = calcularPrediccion({ stockActual: 50, ventasDiarias, tiempoEntregaDias: null });
    expect(amarillo.estado).toBe('amarillo'); // 5 dias <= 7

    const verde = calcularPrediccion({ stockActual: 200, ventasDiarias, tiempoEntregaDias: null });
    expect(verde.estado).toBe('verde'); // 20 dias > 7
  });
});

describe('forecasting.regresionLineal', () => {
  test('pendiente 0 con un solo valor', () => {
    expect(regresionLineal([5])).toEqual({ slope: 0, intercept: 5 });
  });

  test('pendiente positiva con serie creciente', () => {
    const { slope } = regresionLineal([1, 2, 3, 4, 5]);
    expect(slope).toBeCloseTo(1, 5);
  });
});

describe('forecasting.promedio', () => {
  test('arreglo vacío devuelve 0', () => {
    expect(promedio([])).toBe(0);
  });

  test('calcula el promedio simple', () => {
    expect(promedio([2, 4, 6])).toBe(4);
  });
});
