/**
 * Simple JSON file database — no native dependencies.
 * Stores all leads in leads.json next to this file.
 */
const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'leads.json');

function readDb() {
  if (!fs.existsSync(DB_FILE)) return { leads: [], nextId: 1 };
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { leads: [], nextId: 1 };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function insertLead(fields) {
  const db  = readDb();
  const row = { id: db.nextId++, ...fields, created_at: new Date().toISOString() };
  db.leads.push(row);
  writeDb(db);
  return row;
}

function getLeads(type) {
  const { leads } = readDb();
  const filtered  = type ? leads.filter(l => l.type === type) : leads;
  return filtered.slice().reverse(); // newest first
}

function deleteLead(id) {
  const db  = readDb();
  const idx = db.leads.findIndex(l => l.id === Number(id));
  if (idx === -1) return false;
  db.leads.splice(idx, 1);
  writeDb(db);
  return true;
}

function getStats() {
  const { leads } = readDb();
  const today = new Date().toISOString().slice(0, 10);
  return {
    total:       leads.length,
    residential: leads.filter(l => l.type === 'residential').length,
    commercial:  leads.filter(l => l.type === 'commercial').length,
    today:       leads.filter(l => l.created_at.startsWith(today)).length,
  };
}

// No init needed — file is created on first write
function initDb() {
  if (!fs.existsSync(DB_FILE)) writeDb({ leads: [], nextId: 1 });
  console.log('Database ready (leads.json).');
}

module.exports = { initDb, insertLead, getLeads, deleteLead, getStats };
