const net = require('net');
const { getDb } = require('./db');

async function handleMessage(msg) {
  const db = await getDb();

  // --- INSERT: {insert:{"nombre":"...", ...}} ---
  if (msg.startsWith('{insert:') && msg.endsWith('}')) {
    const elementStr = msg.slice('{insert:'.length, -1);
    let element;
    try {
      element = JSON.parse(elementStr);
    } catch {
      return { statusCode: 400, data: { error: 'JSON inválido dentro de insert' } };
    }

    const { nombre, descripcion, precio, stock, categoria_id } = element;
    if (!nombre || precio === undefined) {
      return { statusCode: 400, data: { error: 'nombre y precio son obligatorios' } };
    }

    const result = await db.run(
      `INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, descripcion || null, precio, stock || 0, categoria_id || null]
    );
    const nuevo = await db.get('SELECT * FROM productos WHERE id = ?', [result.lastID]);
    return { statusCode: 201, data: nuevo };
  }

  // --- GET: {get:1} ---
  if (msg.startsWith('{get:') && msg.endsWith('}')) {
    const idStr = msg.slice('{get:'.length, -1).trim();

    const producto = await db.get(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.id = ?`,
      [idStr]
    );

    if (!producto) {
      return { statusCode: 404, data: { error: 'Elemento no encontrado' } };
    }
    return { statusCode: 200, data: producto };
  }

  return {
    statusCode: 400,
    data: { error: 'Formato no reconocido. Usa {insert:<element>} o {get:<element>}' },
  };
}

function createTcpServer() {
  const server = net.createServer((socket) => {
    console.log('Cliente TCP conectado:', socket.remoteAddress);
    socket.setEncoding('utf8');

    socket.on('data', async (chunk) => {
      const msg = chunk.toString().trim();
      if (!msg) return;

      try {
        const response = await handleMessage(msg);
        socket.write(JSON.stringify(response) + '\n');
      } catch (err) {
        socket.write(JSON.stringify({ statusCode: 500, data: { error: err.message } }) + '\n');
      }
    });

    socket.on('error', (err) => {
      console.error('Error en socket TCP:', err.message);
    });
  });

  return server;
}

module.exports = { createTcpServer };