const request = require('supertest');
const mongoose = require('mongoose');
const { crearApp } = require('../../src/app');

const app = crearApp();

describe('GET /health', () => {
  test('Mongo desconectado -> 503', async () => {
    // readyState 0 = disconnected, es el estado por defecto sin conexión real en tests.
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degradado');
    expect(res.body.mongo).toBe('disconnected');
  });

  test('Mongo conectado -> 200', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.mongo).toBe('connected');
  });
});
