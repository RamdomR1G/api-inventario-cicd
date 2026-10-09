const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { sendResponse } = require('../utils/response');

// GET /productos - listar todos
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const productos = await db.all(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `);
    sendResponse(res, 200, productos);
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

// GET /productos/:id - obtener uno
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const producto = await db.get(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!producto) return sendResponse(res, 404, { error: 'Producto no encontrado' });
    sendResponse(res, 200, producto);
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

// POST /productos - crear
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria_id } = req.body;

    if (!nombre || precio === undefined) {
      return sendResponse(res, 400, { error: 'nombre y precio son obligatorios' });
    }

    const db = await getDb();
    const result = await db.run(
      `INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, descripcion || null, precio, stock || 0, categoria_id || null]
    );

    const nuevo = await db.get('SELECT * FROM productos WHERE id = ?', [result.lastID]);
    sendResponse(res, 201, nuevo);
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

// PUT /productos/:id - actualizar
router.put('/:id', async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria_id } = req.body;
    const db = await getDb();

    const existente = await db.get('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (!existente) return sendResponse(res, 404, { error: 'Producto no encontrado' });

    await db.run(
      `UPDATE productos
       SET nombre = ?, descripcion = ?, precio = ?, stock = ?, categoria_id = ?
       WHERE id = ?`,
      [
        nombre ?? existente.nombre,
        descripcion ?? existente.descripcion,
        precio ?? existente.precio,
        stock ?? existente.stock,
        categoria_id ?? existente.categoria_id,
        req.params.id,
      ]
    );

    const actualizado = await db.get('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    sendResponse(res, 200, actualizado);
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

// DELETE /productos/:id - eliminar uno
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const existente = await db.get('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (!existente) return sendResponse(res, 404, { error: 'Producto no encontrado' });

    await db.run('DELETE FROM productos WHERE id = ?', [req.params.id]);
    sendResponse(res, 200, { mensaje: 'Producto eliminado', id: req.params.id });
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

// DELETE /productos - vaciar la tabla completa
router.delete('/', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM productos');
    sendResponse(res, 200, { mensaje: 'Tabla de productos vaciada' });
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

module.exports = router;