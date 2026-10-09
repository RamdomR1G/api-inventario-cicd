const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getDb, DB_PATH } = require('../db');
const { sendResponse } = require('../utils/response');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

// POST /backup - respaldo de la BD completa
router.post('/backup', async (req, res) => {
  try {
    // Aseguramos que exista la conexión (y por lo tanto el archivo .db)
    await getDb();

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    fs.copyFileSync(DB_PATH, backupPath);

    sendResponse(res, 200, {
      mensaje: 'Backup creado exitosamente',
      archivo: backupFileName,
    });
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

// DELETE /reset - vaciar TODA la base de datos (productos y categorías)
router.delete('/reset', async (req, res) => {
  try {
    const db = await getDb();
    await db.exec('DELETE FROM productos');
    await db.exec('DELETE FROM categorias');
    // Reiniciamos los contadores autoincrementales
    await db.exec("DELETE FROM sqlite_sequence WHERE name IN ('productos','categorias')");

    sendResponse(res, 200, { mensaje: 'Base de datos vaciada completamente' });
  } catch (err) {
    sendResponse(res, 500, { error: err.message });
  }
});

module.exports = router;