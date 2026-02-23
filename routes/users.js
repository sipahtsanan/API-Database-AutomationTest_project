const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── Validation Helper ───────────────────────────────────────────────
// validate เฉพาะ format (ไม่เช็ค required)
function validateCidFormat(cid) {
  if (typeof cid !== 'string') return 'cid must be a string';
  if (!/^\d+$/.test(cid)) return 'cid must be numeric';
  if (cid.length !== 13) return 'cid must be exactly 13 digits';
  return null;
}

// validate ทั้ง required + format
function validateCid(cid) {
  if (!cid) return 'cid is required';
  return validateCidFormat(cid);
}

// ─── CREATE USER  POST /api/users ────────────────────────────────────
// Body: { cid, name, surname } Note: cid is mandatory
router.post('/', (req, res) => {
  const { cid, name, surname } = req.body;

  const cidError = validateCid(cid);
  if (cidError) return res.status(400).json({ message: cidError });

  if (name && name.length > 50)
    return res.status(400).json({ message: 'name must not exceed 50 characters' });
  if (surname && surname.length > 50)
    return res.status(400).json({ message: 'surname must not exceed 50 characters' });

  try {
    const stmt = db.prepare(`
      INSERT INTO user (cid, name, surname, status, delete_user)
      VALUES (?, ?, ?, 'active', 0)
    `);
    stmt.run(cid, name || null, surname || null);

    const user = db.prepare('SELECT * FROM user WHERE cid = ?').get(cid);
    return res.status(201).json({ message: 'User created successfully', data: formatUser(user) });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: `User with cid '${cid}' already exists` });
    }
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET USER(S)  POST /api/users/search ────────────
// Body: { "cid": "1234567890123" } or {}
router.post('/search', (req, res) => {
  const { cid } = req.body;

  // ถ้าส่ง cid มา → validate format แต่ไม่บังคับ required
  if (cid !== undefined) {
    const cidError = validateCidFormat(cid);
    if (cidError) return res.status(400).json({ message: cidError });

    const user = db.prepare('SELECT * FROM user WHERE cid = ?').get(cid);
    if (!user) return res.status(404).json({ message: `User with cid '${cid}' not found` });
    return res.json({ success: true, data: formatUser(user) });
  }

  // ไม่ส่ง cid → get all
  const users = db.prepare('SELECT * FROM user').all();
  return res.json({ data: users.map(formatUser) });
});

// ─── UPDATE USER  POST /api/users/update ────────────────────────────────
// Body: { cid, name, surname, status } Note: cid is mandatory
router.post('/update', (req, res) => {
  const { cid, name, surname, status } = req.body;

  const cidError = validateCid(cid);
  if (cidError) return res.status(400).json({ message: cidError });

  const user = db.prepare('SELECT * FROM user WHERE cid = ?').get(cid);
  if (!user) return res.status(404).json({ message: `User with cid '${cid}' not found` });

  if (name !== undefined && name.length > 50)
    return res.status(400).json({ message: 'name must not exceed 50 characters' });
  if (surname !== undefined && surname.length > 50)
    return res.status(400).json({ message: 'surname must not exceed 50 characters' });
  if (status !== undefined && !['active', 'inactive'].includes(status))
    return res.status(400).json({ message: "status must be 'active' or 'inactive'" });

  const updatedName    = name    !== undefined ? name    : user.name;
  const updatedSurname = surname !== undefined ? surname : user.surname;
  const updatedStatus  = status  !== undefined ? status  : user.status;

  const updatedDeleteUser = updatedStatus === 'inactive' ? 1 : 0;

  db.prepare(`
    UPDATE user SET name = ?, surname = ?, status = ?, delete_user = ? WHERE cid = ?
  `).run(updatedName, updatedSurname, updatedStatus, updatedDeleteUser, cid);

  const updated = db.prepare('SELECT * FROM user WHERE cid = ?').get(cid);
  return res.json({ message: 'User updated successfully', data: formatUser(updated) });
});

// ─── DELETE USER (Soft Delete)  DELETE /api/users ────────────────────
// Body: { cid }
router.delete('/', (req, res) => {
  const { cid } = req.body;

  const cidError = validateCid(cid);
  if (cidError) return res.status(400).json({ message: cidError });

  const user = db.prepare('SELECT * FROM user WHERE cid = ?').get(cid);
  if (!user) return res.status(404).json({ message: `User with cid '${cid}' not found` });

  if (user.delete_user === 1)
    return res.status(409).json({ message: `User with cid '${cid}' is already deleted` });

  db.prepare(`
    UPDATE user SET delete_user = 1, status = 'inactive' WHERE cid = ?
  `).run(cid);

  const updated = db.prepare('SELECT * FROM user WHERE cid = ?').get(cid);
  return res.json({ message: 'User soft-deleted successfully', data: formatUser(updated) });
});

// ─── Format output (convert SQLite integer boolean → real boolean) ───
function formatUser(user) {
  return {
    ...user,
    delete_user: user.delete_user === 1,
  };
}

module.exports = router;