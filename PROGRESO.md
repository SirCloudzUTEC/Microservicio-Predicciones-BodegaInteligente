# PROGRESO — Persona 4 (`prediccion-service`)

> Documento operativo de seguimiento. **Léelo antes de tocar `prediccion-service/`.**
> Distinto de `contexto.md` (visión general de los 6 microservicios del
> proyecto completo, escrito una sola vez al inicio y que ya empieza a
> quedar desactualizado en detalles menores — ver nota en su sección 9).
>
> Última actualización: 2026-09-08 · diego.godoy.t@utec.edu.pe

## 1. Bugs de robustez — ✅ corregidos

- [x] `obtenerUltima`/`listarUltimas`/`historial` sin `try/catch` → causaban
      que una request se colgara sin respuesta si Mongo fallaba (Express 4
      no captura rechazos de promesas async automáticamente). Fix:
      `src/utils/asyncHandler.js`, aplicado a las 5 rutas en
      `src/routes/predicciones.routes.js`.
- [x] `/health` no validaba la conexión real a Mongo → ahora usa
      `mongoose.connection.readyState` y devuelve 503 si no está conectado
      (`src/app.js`).
- [x] Sin graceful shutdown → `server.js` ahora captura `SIGTERM`/`SIGINT`,
      cierra el servidor HTTP y la conexión Mongo antes de salir.
- [x] `calcularParaProducto` no distinguía "datos inválidos de una
      dependencia" de "dependencia caída" → ahora valida `stockActual`
      numérico antes de calcular, y `manejarErrorDependencia` da un mensaje
      distinto para cada caso (ambos siguen devolviendo 502, por la
      convención del equipo).
- [x] `test:logic` en `package.json` apuntaba a un archivo inexistente →
      reemplazado por la suite Jest real (`npm test`).

## 2. Pendientes de la sección 9 de `contexto.md` — ✅ resueltos

- [x] Seed de ≥20,000 registros → `scripts/seed.js`, `npm run seed` /
      `npm run seed:drop`. Genera 21,000 documentos coherentes (usa la
      función real `calcularPrediccion()`) para 60 productos sintéticos
      `P009`–`P068`.
- [x] Swagger-UI en `/api-docs` → documenta las **5 rutas reales** (no 7:
      el conteo anterior duplicaba `GET /predicciones` con y sin
      `?estado=`, que es el mismo endpoint con un query param opcional).
- [x] Cron diario de recálculo → `node-cron` en `src/jobs/cronRecalculo.js`,
      configurable con `CRON_RECALCULO`/`CRON_TZ`, arrancado solo desde
      `server.js` (nunca desde `app.js`, para no dispararse en los tests).
- [x] Tests formales → Jest + Supertest, 22 tests (`tests/unit/`,
      `tests/integration/`), todos verdes.
- [ ] Reemplazar mocks por servicios reales de Persona 1/2/3 — **sigue
      bloqueado**, no depende de Persona 4.

## 3. Decisiones de diseño (para no re-discutirlas en sesiones futuras)

- **Testing**: Jest + supertest, con `jest.mock()` sobre
  `src/models/Prediccion` y `src/services/httpClients`. Se descartó
  `mongodb-memory-server` (descarga un binario de `mongod` en la primera
  corrida — riesgo de fallo/lentitud sin red garantizada, justo antes de
  una entrega con plazo ajustado) y `nock` (mockear el módulo de
  httpClients ya alcanza, es más simple).
- **Seed**: productos sintéticos `P009`–`P068` (60 × 350 días = 21,000
  documentos), a propósito fuera del rango `P001`–`P008` de los mocks, para
  no contaminar la demo/Postman. Reutiliza `calcularPrediccion()` real
  sobre series de ventas generadas con un PRNG determinístico (mulberry32),
  no ruido puro. Inserción por lotes de 2,000 con `insertMany`. Idempotente
  por defecto (`npm run seed` no duplica), `--drop` para regenerar.
  Verificado sin conexión real a Mongo: 21,000 documentos generados, todos
  pasan `validateSync()` contra el schema de `Prediccion`.
- **Cron**: vive en `server.js`, no en `app.js`, para que nunca se dispare
  durante `npm test` (que instancia `app.js` vía `crearApp()` sin pasar por
  `server.js`).
- **Reuso**: `calcularTodos` (el endpoint) ahora delega en
  `ejecutarRecalculoGlobal()` (exportada desde el controller), que también
  usa el cron — se eliminó la duplicación de esa lógica.
- **Códigos HTTP**: 502 sigue siendo el código para "problema con una
  dependencia" (convención ya existente del equipo), ahora con dos
  mensajes de error distintos (datos inválidos vs. dependencia caída) en
  vez de inventar un código nuevo.
- **Swagger**: documentado vía JSDoc `@swagger` directamente en
  `src/routes/predicciones.routes.js` (no un archivo YAML aparte), spec
  generado en `src/config/swagger.js`.

## 4. Cómo correr lo nuevo

```bash
cd prediccion-service
npm install
npm test                 # suite Jest (22 tests)
npm run seed              # carga masiva en Mongo (idempotente)
npm run seed:drop          # regenera el rango sintético P009-P068
npm start                   # o npm run dev
# Swagger UI: http://localhost:4004/api-docs
# Health check: http://localhost:4004/health
```

Variables de entorno nuevas en `.env`/`docker-compose.yml`:
`CRON_RECALCULO` (default `0 3 * * *`), `CRON_TZ` (default `America/Lima`).

## 5. Verificación realizada en esta sesión

- `node --check` en todos los archivos nuevos/modificados → compilan.
- `npm test` → 22/22 tests verdes, incluyendo un test de regresión
  explícito que confirma que un fallo de Mongo en `obtenerUltima` devuelve
  `500` y no cuelga la request (el bug original).
- Spec de Swagger generado en memoria → detecta correctamente las 5 rutas.
- Generación del seed corrida en aislamiento (sin Mongo real, no
  disponible en este entorno de sesión): 21,000 documentos generados,
  campos numéricos válidos, estados dentro del enum esperado, y **cada
  documento pasa `new Prediccion(doc).validateSync()`** contra el schema
  real sin errores.
- **No verificado en esta sesión** (Docker no estaba disponible en el
  entorno de ejecución): `docker compose up --build` de punta a punta,
  inserción real del seed contra un Mongo vivo, y el flujo de graceful
  shutdown con un proceso real. Recomendado correrlo manualmente antes de
  la demo:
  ```bash
  docker compose up --build
  curl localhost:4004/health
  curl -X POST localhost:4004/api/predicciones/P001/calcular
  cd prediccion-service && npm run seed
  # abrir http://localhost:4004/api-docs
  docker compose stop prediccion-service   # confirmar cierre limpio en logs
  ```

## 6. Pendiente real, fuera del control de Persona 4

- [ ] Subir `prediccion-service` a un repo público de GitHub propio.
- [ ] Reemplazar los mocks (`INVENTARIO_URL`, `VENTAS_URL`,
      `PROVEEDORES_URL`) por las URLs reales cuando Persona 1, 2 y 3
      desplieguen sus microservicios, y borrar `mocks/`.
- [ ] Diagrama de estructura JSON de la colección `Prediccion` (Mongo) para
      el informe de Data Science del equipo — el modelo está en
      `src/models/Prediccion.js`, solo falta documentarlo visualmente.
