const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { sendResponse } = require('../utils/response');

// GET /categorias - listar todas
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const categorias = await db.all('SELECT * FROM categorias');
    sendResponse(res, 200, categorias);
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

// POST /categorias - crear
router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return sendResponse(res, 400, { error: 'nombre es obligatorio' });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO categorias (nombre) VALUES (?)',
      [nombre]
    );

    const nueva = await db.get('SELECT * FROM categorias WHERE id = ?', [result.lastID]);
    sendResponse(res, 201, nueva);
  } catch (err) {
    // err.message contendrá algo como "UNIQUE constraint failed" si el nombre ya existe
    sendResponse(res, 500, { error: err.message });
  }
});

// DELETE /categorias/:id - eliminar
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const existente = await db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
    if (!existente) return sendResponse(res, 404, { error: 'Categoría no encontrada' });

    await db.run('DELETE FROM categorias WHERE id = ?', [req.params.id]);
    sendResponse(res, 200, { mensaje: 'Categoría eliminada', id: req.params.id });
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

module.exports = router;