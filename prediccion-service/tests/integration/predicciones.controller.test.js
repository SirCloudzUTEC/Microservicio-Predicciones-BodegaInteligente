const request = require('supertest');

jest.mock('../../src/models/Prediccion');
jest.mock('../../src/services/httpClients');

const Prediccion = require('../../src/models/Prediccion');
const httpClients = require('../../src/services/httpClients');
const { crearApp } = require('../../src/app');

const app = crearApp();

function mockFindOneChain(resultado) {
  Prediccion.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(resultado) });
}

function mockFindChain(resultado) {
  Prediccion.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(resultado) }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/predicciones/:productoId/calcular', () => {
  test('happy path: calcula y guarda la predicción -> 201', async () => {
    httpClients.obtenerStockProducto.mockResolvedValue({
      productoId: 'P001',
      nombre: 'Arroz extra 1kg',
      stockActual: 120,
    });
    httpClients.obtenerHistorialVentas.mockResolvedValue({
      productoId: 'P001',
      historial: new Array(14).fill({ fecha: '2026-01-01', cantidad: 10 }),
    });
    httpClients.obtenerTiempoEntrega.mockResolvedValue({
      productoId: 'P001',
      proveedor: 'Distribuidora Central',
      tiempoEntregaDias: 3,
    });
    Prediccion.create.mockResolvedValue({ productoId: 'P001', estado: 'verde' });

    const res = await request(app).post('/api/predicciones/P001/calcular');

    expect(res.status).toBe(201);
    expect(Prediccion.create).toHaveBeenCalledTimes(1);
  });

  test('Inventario devuelve stockActual inválido -> 502 con mensaje de datos inválidos', async () => {
    httpClients.obtenerStockProducto.mockResolvedValue({ productoId: 'P001', nombre: 'X' }); // sin stockActual
    httpClients.obtenerHistorialVentas.mockResolvedValue({ productoId: 'P001', historial: [] });
    httpClients.obtenerTiempoEntrega.mockResolvedValue(null);

    const res = await request(app).post('/api/predicciones/P001/calcular');

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Datos inválidos/);
  });

  test('dependencia caída (sin respuesta) -> 502', async () => {
    httpClients.obtenerStockProducto.mockRejectedValue(new Error('connect ECONNREFUSED'));
    httpClients.obtenerHistorialVentas.mockResolvedValue({ productoId: 'P001', historial: [] });
    httpClients.obtenerTiempoEntrega.mockResolvedValue(null);

    const res = await request(app).post('/api/predicciones/P001/calcular');

    expect(res.status).toBe(502);
  });
});

describe('GET /api/predicciones/:productoId', () => {
  test('devuelve la última predicción -> 200', async () => {
    mockFindOneChain({ productoId: 'P001', estado: 'verde' });

    const res = await request(app).get('/api/predicciones/P001');

    expect(res.status).toBe(200);
    expect(res.body.productoId).toBe('P001');
  });

  test('sin predicciones guardadas -> 404', async () => {
    mockFindOneChain(null);

    const res = await request(app).get('/api/predicciones/P999');

    expect(res.status).toBe(404);
  });

  test('regresión del bug de cuelgue: error de Mongo -> 500, no timeout', async () => {
    Prediccion.findOne.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('Mongo no disponible')),
    });

    const res = await request(app).get('/api/predicciones/P001');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/predicciones', () => {
  test('lista la última predicción de todos los productos', async () => {
    Prediccion.aggregate.mockResolvedValue([
      { productoId: 'P001', estado: 'verde' },
      { productoId: 'P002', estado: 'rojo' },
    ]);

    const res = await request(app).get('/api/predicciones');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filtra por ?estado=rojo', async () => {
    Prediccion.aggregate.mockResolvedValue([{ productoId: 'P002', estado: 'rojo' }]);

    const res = await request(app).get('/api/predicciones?estado=rojo');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].estado).toBe('rojo');
  });
});

describe('POST /api/predicciones/calcular-todos', () => {
  test('calcula todos los productos y devuelve 207 con el resumen', async () => {
    httpClients.obtenerListaProductos.mockResolvedValue([{ id: 'P001' }, { id: 'P002' }]);
    httpClients.obtenerStockProducto.mockResolvedValue({ productoId: 'P001', nombre: 'X', stockActual: 10 });
    httpClients.obtenerHistorialVentas.mockResolvedValue({ productoId: 'P001', historial: [] });
    httpClients.obtenerTiempoEntrega.mockResolvedValue(null);
    Prediccion.create.mockResolvedValue({ estado: 'sin_datos' });

    const res = await request(app).post('/api/predicciones/calcular-todos');

    expect(res.status).toBe(207);
    expect(res.body.total).toBe(2);
    expect(res.body.calculados).toBe(2);
  });

  test('Inventario no responde a la lista de productos -> 502', async () => {
    httpClients.obtenerListaProductos.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const res = await request(app).post('/api/predicciones/calcular-todos');

    expect(res.status).toBe(502);
  });
});

describe('GET /api/predicciones/:productoId/historial', () => {
  test('devuelve el historial de predicciones', async () => {
    mockFindChain([{ productoId: 'P001', estado: 'verde' }]);

    const res = await request(app).get('/api/predicciones/P001/historial');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
