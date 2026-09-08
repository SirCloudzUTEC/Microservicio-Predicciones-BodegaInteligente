# Contexto del proyecto — ERP Bodega Inteligente (CS2032 Cloud Computing, UTEC)

Este documento resume todo lo necesario para seguir implementando el proyecto sin
tener que releer el hilo de chat original. Está pensado para dárselo a Claude Code
como contexto de arranque.

## 1. Qué es el proyecto

Curso: **CS2032 – Cloud Computing (Ciclo 2026-2)**, UTEC, Lima, Perú. Proyecto
Parcial en equipo de 5 personas.

Idea: **ERP simple para una bodega/minimarket inteligente**. El bodeguero
registra su inventario y sus ventas diarias; el sistema predice qué productos
se van a agotar antes del próximo pedido al proveedor, y muestra un semáforo
(🟢/🟡/🔴) con alerta de "pedir ya" por producto. Resuelve un dolor real:
perder ventas por quiebre de stock.

## 2. Arquitectura general

```
Frontend (AWS Amplify, React SPA)
        │
        ▼
API Gateway (https)
        │
        ▼
Balanceador de carga (privado, no público)
        │
   ┌────┴────┐
   ▼         ▼
 VM 1       VM 2       (producción, docker-compose)
(3 msvc)   (3 msvc)
   │         │
   └────┬────┘
        ▼
   VM 3 — bases de datos (privada, no pública)
   (2 MySQL, 1 PostgreSQL, 1 MongoDB)
```

`Analítica` no usa la VM 3: consulta directo a **AWS Athena** sobre datos
cargados en S3.

## 3. Los 6 microservicios

El enunciado del curso exige exactamente 5 microservicios con esta estructura:
**3 con base de datos propia (3 lenguajes distintos, 2 SQL + 1 NoSQL, al menos
uno debe consumir a otro), 1 sin base de datos que solo consume a los demás, y
1 analítico que use AWS Athena.** El equipo decidió agregar un 6to
microservicio (Proveedores) como aporte extra — los 5 roles obligatorios de
la rúbrica siguen cubiertos por los otros 5.

| # | Microservicio | Lenguaje | Base de datos | Tablas / estructura | Consume a |
|---|---------------|----------|----------------|----------------------|-----------|
| 1 | **Inventario** | Python | MySQL | `productos`, `movimientos_inventario` | — |
| 2 | **Ventas** | Java | PostgreSQL | `ventas_diarias`, `pedidos_proveedor` | — |
| 3 | **Proveedores** *(extra)* | Python | MySQL | `proveedores`, `tiempos_entrega` | — |
| 4 | **Predicción** ✅ construido | Node.js | MongoDB | predicciones por producto/día | Inventario, Ventas, Proveedores |
| 5 | **Alertas** | sin BD | — | — | Inventario, Ventas, Predicción, Proveedores |
| 6 | **Analítica** | Python | Athena (sobre S3) | consultas SQL vía Athena | Catálogo de datos (Glue) |

## 4. Frontend (AWS Amplify)

- Vista principal semáforo: grid de productos 🟢/🟡/🔴 + alerta "pedir ya"
  (consume Alertas).
- Vista de detalle por producto: stock actual vs. predicción de agotamiento
  vs. tiempo de entrega del proveedor (consume Inventario + Predicción +
  Proveedores).
- Panel de estadísticas con gráficos del microservicio Analítico.
- Cada uno de los 6 microservicios debe ser invocado con mínimo 2 métodos
  REST desde el frontend.

## 5. Data Science

- MV "Ingesta" con contenedores Python (uno por cada microservicio con BD:
  Inventario, Ventas, Proveedores, y opcionalmente Predicción), estrategia
  pull del 100% de los registros, generan CSV/JSON hacia un bucket S3.
- Catálogo de datos en AWS Glue por cada archivo cargado + diagrama E/R de
  todas las tablas del catálogo.
- Mínimo 4 consultas SQL que unan varias tablas en Athena, mínimo 2 vistas.
- El microservicio Analítica consulta ese catálogo vía Athena.

## 6. División del equipo (5 personas)

| Integrante | Rol principal |
|------------|----------------|
| 1 | Inventario + Frontend (vista de detalle de producto) |
| 2 | Ventas + Frontend (semáforo y panel analítico) |
| 3 | Proveedores + Alertas |
| **4** | **Predicción (modelo de forecasting)** ← ya construido, ver sección 8 |
| 5 | Analítica + Data Science completo (pipeline + diagrama de arquitectura) |

Trabajo compartido entre los 5: despliegue docker-compose en las VMs de
producción, documentación Swagger de cada API, informe final (Word/PDF) +
resumen en PPT, ensayo de la exposición.

## 7. Estrategia de repositorios (decidida)

**Un repositorio público de GitHub por microservicio/parte**, no un
monorepo con branches por implementación:

```
inventario-service        (Integrante 1)
ventas-service             (Integrante 2)
proveedores-service         (Integrante 3)
prediccion-service           (Integrante 4) ← ya armado, ver sección 8
alertas-service                (Integrante 3)
analitica-service                (Integrante 5)
bodega-frontend                     (Integrantes 1 y 2)
bodega-data-science                      (Integrante 5)
```

Razón: el enunciado pide "enlaces a repositorios públicos de GitHub" por
cada sección (Backend/Frontend/Data Science), y las branches no permiten que
varios servicios corran juntos desde el mismo checkout. `prediccion-service`
ya está armado como carpeta autocontenible, lista para convertirse en su
propio repo (`git init` + push).

## 8. Estado actual: lo que YA está construido (Persona 4 — Predicción)

**Restricción del equipo: no usar Python en ningún microservicio de
Predicción.** El modelo es una regresión lineal simple hecha a mano en
JavaScript (mínimos cuadrados), sin librerías de ML.

### Estructura de archivos

```
prediccion-service/
├── server.js                              # entry point
├── src/
│   ├── app.js                             # Express app + middlewares
│   ├── config/db.js                       # conexión Mongoose
│   ├── models/Prediccion.js               # schema Mongoose
│   ├── services/httpClients.js            # clientes axios a Inventario/Ventas/Proveedores
│   ├── logic/forecasting.js               # EL MODELO: regresión + heurística semáforo
│   ├── controllers/predicciones.controller.js
│   └── routes/predicciones.routes.js
├── package.json  (express, mongoose, axios, dotenv, cors)
├── Dockerfile
├── .dockerignore
└── .env.example

mocks/                          # TEMPORALES — se descartan cuando existan los reales
├── inventario-mock/            # puerto 4001, 8 productos ficticios (P001-P008)
├── ventas-mock/                # puerto 4002, historial de ventas 14 días por producto
└── proveedores-mock/           # puerto 4003, tiempos de entrega por producto

docker-compose.yml              # mongo + 3 mocks + prediccion-service, todo wireado
postman_collection.json         # 11 requests cubriendo todos los endpoints
README.md                       # instrucciones + contrato de endpoints
```

### Algoritmo (`src/logic/forecasting.js`)

1. Toma el historial de ventas diarias de los últimos 14 días.
2. Calcula el promedio de venta diaria.
3. Calcula la tendencia con regresión lineal simple (mínimos cuadrados).
4. Consumo proyectado = promedio + tendencia (mínimo 0.01 para evitar
   división por cero).
5. `días hasta agotamiento = stock actual / consumo proyectado`.
6. Clasifica el semáforo comparando contra el tiempo de entrega del
   proveedor:
   - `días ≤ tiempo de entrega` → 🔴 rojo
   - `días ≤ 1.5 × tiempo de entrega` → 🟡 amarillo
   - si no → 🟢 verde
   - si no hay dato de proveedor, clasifica solo por días de cobertura
     (≤3 rojo, ≤7 amarillo).
7. Calcula `probQuiebre` (0 a 1) para poder ordenar/priorizar en el
   dashboard.

### Endpoints expuestos

`prediccion-service` tiene **5 rutas de negocio** (bajo `/api`) + `/health`.
`?estado=` es un query param opcional de `GET /predicciones`, no una ruta
aparte (una confusión de conteo de una versión anterior de este documento
ya corregida).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | health check (valida también la conexión a MongoDB) |
| POST | `/api/predicciones/:productoId/calcular` | recalcula y guarda la predicción de un producto |
| POST | `/api/predicciones/calcular-todos` | recalcula todos los productos (también lo llama el cron diario) |
| GET | `/api/predicciones/:productoId` | última predicción de un producto |
| GET | `/api/predicciones/:productoId/historial` | historial de predicciones (para graficar tendencia) |
| GET | `/api/predicciones` (+ `?estado=rojo` opcional) | última predicción de TODOS los productos, opcionalmente filtrada por color del semáforo (consumido por Alertas y el frontend) |

### Contrato que deben respetar los microservicios reales

Para que Persona 1, 2 y 3 puedan reemplazar los mocks sin tocar
`prediccion-service`, sus APIs reales deben exponer:

- **Inventario**: `GET /productos` y `GET /productos/:id/stock` →
  `{ productoId, nombre, stockActual }`
- **Ventas**: `GET /productos/:id/historial?dias=14` →
  `{ productoId, historial: [{ fecha, cantidad }, ...] }`
- **Proveedores**: `GET /productos/:id/tiempo-entrega` →
  `{ productoId, proveedor, tiempoEntregaDias }`

Cuando estén listos: cambiar `INVENTARIO_URL`, `VENTAS_URL`,
`PROVEEDORES_URL` (env vars) y borrar `mocks/`. Nada más del código cambia.

### Variables de entorno (`prediccion-service/.env.example`)

```
PORT=4004
MONGO_URI=mongodb://mongo:27017/prediccion_db
INVENTARIO_URL=http://inventario-mock:4001
VENTAS_URL=http://ventas-mock:4002
PROVEEDORES_URL=http://proveedores-mock:4003
```

### Qué se probó (no solo se escribió)

- `node --check` en los 8 archivos JS del microservicio → todos compilan.
- Test unitario de `forecasting.js` con 3 escenarios (consumo estable,
  consumo creciente con poco stock, sin historial) → resultados correctos.
- Prueba de integración real end-to-end: se levantaron los 3 mocks +
  `httpClients.js` + `forecasting.js` juntos contra los 8 productos de
  prueba → los 3 colores del semáforo (verde/amarillo/rojo) aparecieron
  correctamente. (La persistencia en Mongo no se pudo probar en este
  entorno por no tener `mongod` disponible, pero el modelo Mongoose sigue
  el patrón estándar de la librería.)

## 9. Pendiente específico de Persona 4 (próximos pasos para Claude Code)

> ⚠️ Esta sección quedó desactualizada tras la sesión que agregó seed,
> Swagger, cron y tests formales. El estado real y al día está en
> `PROGRESO.md` (raíz del repo) — léelo primero antes de asumir que algo
> de esta lista sigue pendiente.

Estos son los siguientes pasos concretos sobre `prediccion-service`, en
orden sugerido:

1. **Script de carga masiva de datos ficticios** — el enunciado exige
   mínimo 20,000 registros en al menos una colección de cada base de
   datos. Falta un script (`scripts/seed.js` o similar) que inserte ≥20,000
   predicciones/documentos ficticios en MongoDB, por única vez.
2. **Documentación Swagger-UI** — agregar `swagger-jsdoc` +
   `swagger-ui-express`, documentar las 7 rutas existentes, servir en
   `/api-docs`.
3. **Cron de recálculo automático** — agregar `node-cron` (o similar) que
   llame internamente a la lógica de `calcular-todos` una vez al día, sin
   depender de que alguien pegue el endpoint a mano.
4. **Tests automatizados formales** — convertir las pruebas manuales que
   se hicieron (unitaria + integración) en archivos de test reales
   (ej. Jest o Node's `node:test`), para que corran en CI o antes de cada
   push.
5. Cuando Persona 1/2/3 tengan sus servicios reales desplegados: reemplazar
   las URLs de entorno y eliminar `mocks/`.

## 10. Pendiente a nivel de todo el proyecto (no solo Persona 4)

- Cada microservicio con BD: script de carga masiva (≥20,000 registros en
  al menos 1 tabla/colección).
- Diagrama Entidad/Relación por cada base de datos SQL + estructuras JSON
  de la base NoSQL (Predicción/MongoDB).
- Documentación Swagger-UI de las 6 APIs.
- Despliegue real con docker-compose en las 2 VMs de producción + 3ra VM
  privada de bases de datos, detrás de balanceador de carga privado, APIs
  expuestas públicamente vía AWS API Gateway con https.
- Diagrama de Arquitectura de Solución en draw.io con todos los servicios
  AWS usados (responsabilidad de Integrante 5, pero referencia los 3
  diagramas ya generados para el informe: flujo general, detalle de
  microservicios, arquitectura detallada del backend con VMs).
- Repos públicos de GitHub (uno por microservicio/parte, ver sección 7).
- Informe final (Word/PDF) y resumen en PowerPoint.

## 11. Rúbrica y plazos (referencia)

| Criterio | Puntos |
|----------|--------|
| Backend: microservicios | 7 |
| Frontend: web | 3 |
| Data Science | 5 |
| Diagrama de arquitectura de solución | 1 |
| Exposición presencial | 1 |
| Exposición virtual con ACL | 3 |

Si no se asiste a la exposición presencial, la nota máxima es 10.

| Hito | Descripción | Plazo |
|------|-------------|-------|
| Hito 1 | Exposición virtual revisada por el ACL (3 pts) | Máx. sáb 12-Set 23:59h |
| Hito 2 | Informe + PPT en Canvas, exposición presencial y demo (17 pts) | Dom 20-Set 23:59h |
| Exposición presencial | Semana 7, horario publicado por el docente | Semana 7 |

## 12. Convenciones técnicas a mantener

- Nombres de campos y rutas de API en **español** (`productoId`,
  `stockActual`, `/productos/:id/stock`), consistente con lo ya construido.
- IDs de producto con formato `P00X` (ej. `P001`) en los datos de prueba.
- Cada microservicio con BD propia expone su Dockerfile individual
  (`node:20-alpine` para los servicios Node.js).
- Variables de entorno para URLs de dependencias, nunca hardcodeadas.
- Sin Python en Predicción (restricción explícita del equipo). Los demás
  microservicios sí usan Python según la tabla de la sección 3.
- Respuestas de error HTTP: 404 si el recurso no existe, 502 si una
  dependencia externa falla o no responde.
