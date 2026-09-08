/**
 * Envuelve un handler async de Express para que cualquier rechazo de
 * promesa se pase a next(err) en vez de quedar sin capturar (Express 4 no
 * hace esto automáticamente, y una promesa rechazada sin capturar deja la
 * request colgada sin respuesta).
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
