const express = require('express');
const productosRouter = require('./routes/productos');
const categoriasRouter = require('./routes/categorias');
const adminRouter = require('./routes/admin');
const { sendResponse } = require('./utils/response');

const app = express();

// Middleware para parsear JSON en el body de las peticiones
app.use(express.json());

// Ruta raíz - útil para verificar rápido que el server responde
app.get('/', (req, res) => {
  sendResponse(res, 200, { mensaje: 'API de Inventario funcionando' });
});

// Health check - usado para verificar el despliegue (GET /api/health)
app.get('/api/health', (req, res) => {
  sendResponse(res, 200, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Montamos las rutas
app.use('/productos', productosRouter);
app.use('/categorias', categoriasRouter);
app.use('/', adminRouter); // expone /backup y /reset

// Middleware para rutas no encontradas (404)
app.use((req, res) => {
  sendResponse(res, 404, { error: 'Ruta no encontrada' });
});

// Puerto: dentro del contenedor escuchamos en 80,
// mapeado hacia afuera al 8080 (ver Dockerfile en Parte 2)
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 80;

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });

  const { createTcpServer } = require('./tcpServer');

  const TCP_PORT = process.env.TCP_PORT || 6061;
  createTcpServer().listen(TCP_PORT, () => {
    console.log(`Servidor TCP (socket) escuchando en el puerto ${TCP_PORT}`);
  });
}