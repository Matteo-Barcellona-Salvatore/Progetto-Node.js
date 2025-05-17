const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connesso al DB SQLite.');
});

// Crea tabella se non esiste
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// POST - crea nuovo utente
app.post('/api/users', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
  }

  const sql = 'INSERT INTO users (name, email, message) VALUES (?, ?, ?)';
  db.run(sql, [name, email, message], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: "Email già registrata." });
      }
      return res.status(500).json({ error: err.message });
    }
    // Ritorna il nuovo record creato
    db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

// GET - tutti utenti
app.get('/api/users', (req, res) => {
  const sql = 'SELECT * FROM users ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// PUT - modifica messaggio utente
app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email, message } = req.body;

  // Validazioni base
  if (
    typeof name !== 'string' || name.trim() === '' ||
    typeof email !== 'string' || email.trim() === '' ||
    typeof message !== 'string' || message.trim() === ''
  ) {
    return res.status(400).json({ error: "Nome, email e messaggio sono obbligatori e validi" });
  }

  const sql = `UPDATE users SET name = ?, email = ?, message = ? WHERE id = ?`;
  db.run(sql, [name.trim(), email.trim(), message.trim(), userId], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: "Email già registrata da un altro utente." });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Utente non trovato" });

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});


// DELETE - elimina utente
app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);

  const sql = 'DELETE FROM users WHERE id = ?';
  db.run(sql, userId, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Utente non trovato" });

    res.json({ message: "Utente eliminato" });
  });
});

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
