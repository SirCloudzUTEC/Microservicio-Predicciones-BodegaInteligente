# Persona 4 — Microservicio de Predicción

CS2032 · Cloud Computing · Proyecto Parcial · ERP Bodega Inteligente

Este paquete contiene el trabajo de la **Persona 4**: el microservicio de
**Predicción de quiebre de stock** (Node.js + MongoDB), más 3 mocks
temporales de Inventario, Ventas y Proveedores para poder probarlo de punta
a punta mientras el resto del equipo termina sus microservicios reales.

No se usa Python en ningún punto: el modelo de predicción es una regresión
lineal simple (mínimos cuadrados) implementada a mano en JavaScript, sin
librerías de Machine Learning.

## Estructura

```
persona4/
├── prediccion-service/      ← el entregable real de Persona 4
│   ├── server.js
│   ├── src/
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── models/Prediccion.js
│   │   ├── services/httpClients.js
│   │   ├── logic/forecasting.js   ← el "modelo" (regresión + heurística)
│   │   ├── controllers/predicciones.controller.js
│   │   └── routes/predicciones.routes.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── mocks/                   ← TEMPORALES, se descartan cuando existan los reales
│   ├── inventario-mock/
│   ├── ventas-mock/
│   └── proveedores-mock/
├── docker-compose.yml
├── postman_collection.json
└── README.md
```

## Cómo correrlo

Requiere Docker y Docker Compose.

```bash
cd persona4
docker compose up --build
```

Esto levanta:

| Servicio            | Puerto | Rol                                   |
|----------------------|--------|----------------------------------------|
| mongo                | 27017  | Base de datos de Predicción             |
| inventario-mock      | 4001   | Simula el microservicio de Persona 1    |
| ventas-mock          | 4002   | Simula el microservicio de Persona 2    |
| proveedores-mock     | 4003   | Simula el microservicio de Persona 3    |
| prediccion-service   | 4004   | **El microservicio real de Persona 4**  |

Importa `postman_collection.json` en Postman para probar todos los
endpoints (o usa los `curl` de más abajo).

### Sin Docker (desarrollo local)

```bash
# 3 terminales para los mocks
cd mocks/inventario-mock && npm install && npm start
cd mocks/ventas-mock && npm install && npm start
cd mocks/proveedores-mock && npm install && npm start

# necesitas un Mongo corriendo en localhost:27017 (o docker run -p 27017:27017 mongo:7)
cd prediccion-service
cp .env.example .env   # ya apunta a localhost por defecto si editas las URLs
npm install
npm start
```

## Endpoints de `prediccion-service`

| Método | Ruta                                   | Descripción                                                        |
|--------|-----------------------------------------|----------------------------------------------------------------------|
| GET    | `/health`                               | Chequeo de salud                                                     |
| POST   | `/api/predicciones/:productoId/calcular`| Recalcula y guarda la predicción de un producto                      |
| POST   | `/api/predicciones/calcular-todos`      | Recalcula todos los productos (para correr por cron)                 |
| GET    | `/api/predicciones/:productoId`         | Última predicción guardada de un producto                            |
| GET    | `/api/predicciones/:productoId/historial`| Historial de predicciones de un producto (para graficar tendencia)  |
| GET    | `/api/predicciones`                     | Última predicción de **todos** los productos (consumida por Alertas y el frontend) |
| GET    | `/api/predicciones?estado=rojo`         | Filtra solo los productos en un estado del semáforo                  |

Ejemplo de respuesta de `GET /api/predicciones/P004`:

```json
{
  "productoId": "P004",
  "nombreProducto": "Pan de molde",
  "stockActual": 5,
  "ventaPromedioDiaria": 7.29,
  "tendenciaDiaria": 0.24,
  "diasHastaAgotamiento": 0.7,
  "tiempoEntregaDias": 1,
  "proveedor": "Panificadora Central",
  "probQuiebre": 1,
  "estado": "rojo",
  "fecha": "2026-09-08T20:30:00.000Z"
}
```

## El algoritmo (`src/logic/forecasting.js`)

1. Toma el historial de ventas diarias de los últimos 14 días.
2. Calcula el **promedio de venta diaria**.
3. Calcula la **tendencia** con una regresión lineal simple por mínimos
   cuadrados sobre esa serie (si las ventas están subiendo o bajando).
4. Proyecta el consumo diario esperado = promedio + tendencia.
5. `días hasta agotamiento = stock actual / consumo proyectado`.
6. Compara ese número contra el tiempo de entrega del proveedor:
   - `días hasta agotamiento ≤ tiempo de entrega` → 🔴 **rojo** (pedir ya)
   - `≤ 1.5 × tiempo de entrega` → 🟡 **amarillo**
   - en otro caso → 🟢 **verde**
7. También calcula una `probQuiebre` (0 a 1) proporcional a qué tan cerca
   está el producto del punto de quiebre, útil para ordenar/priorizar en
   el dashboard.

Está probado con `node --check` en todos los archivos y con un script de
integración que corre contra los 3 mocks reales (no simulado): los 8
productos de prueba devuelven los 3 colores del semáforo correctamente.

## Contrato que deben respetar los microservicios reales

Para que Persona 1, 2 y 3 puedan reemplazar los mocks sin tocar
`prediccion-service`, sus APIs reales deben exponer estos mismos endpoints
y formas de respuesta:

- **Inventario**: `GET /productos` y `GET /productos/:id/stock` →
  `{ productoId, nombre, stockActual }`
- **Ventas**: `GET /productos/:id/historial?dias=14` →
  `{ productoId, historial: [{ fecha, cantidad }, ...] }`
- **Proveedores**: `GET /productos/:id/tiempo-entrega` →
  `{ productoId, proveedor, tiempoEntregaDias }`

Cuando estén listos, solo hay que cambiar las variables de entorno
`INVENTARIO_URL`, `VENTAS_URL` y `PROVEEDORES_URL` en `prediccion-service`
(o en `docker-compose.yml`) y borrar la carpeta `mocks/`.

## Pendiente para el entregable final de Persona 4

- [ ] Exponer `prediccion-service` en Swagger-UI (agregar `swagger-jsdoc` +
      `swagger-ui-express`, documentar cada ruta).
- [ ] Subir el repo a GitHub público.
- [ ] Reemplazar los mocks por las URLs reales de Inventario, Ventas y
      Proveedores apenas Persona 1, 2 y 3 los desplieguen.
- [ ] Agregar un `cron` (ej. `node-cron`) que llame a
      `POST /api/predicciones/calcular-todos` una vez al día.
