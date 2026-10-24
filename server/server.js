// Zisch – self-hosted soft drink check-ins.
// No native dependencies: uses Node's built-in HTTP server and SQLite (node:sqlite, Node >= 22.13).
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_DRINKS } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const INVITE_CODE = (process.env.INVITE_CODE || '').trim();
const COOKIE_SECURE = (process.env.COOKIE_SECURE || 'auto').toLowerCase(); // auto | true | false
const TRUST_PROXY = (process.env.TRUST_PROXY || 'true').toLowerCase() !== 'false';
const OFF_LOOKUP = (process.env.OPENFOODFACTS || 'true').toLowerCase() !== 'false';
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SESSION_DAYS = 180;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ------------------------------------------------------------------ database */
const db = new DatabaseSync(path.join(DATA_DIR, 'zisch.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 4000;
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  color TEXT NOT NULL,
  avatar_id TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS drinks(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  sugar_free INTEGER NOT NULL DEFAULT 0,
  caffeine INTEGER,
  note TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS barcodes(
  code TEXT PRIMARY KEY,
  drink_id TEXT NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
  added_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS uploads(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS checkins(
  id TEXT PRIMARY KEY,
  drink_id TEXT NOT NULL REFERENCES drinks(id),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating REAL,
  comment TEXT NOT NULL DEFAULT '',
  photo_id TEXT,
  serving TEXT NOT NULL DEFAULT '',
  place TEXT NOT NULL DEFAULT '',
  badges TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  edited_at INTEGER
);
CREATE INDEX IF NOT EXISTS checkins_created ON checkins(created_at DESC);
CREATE TABLE IF NOT EXISTS toasts(
  checkin_id TEXT NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(checkin_id, user_id)
);
CREATE TABLE IF NOT EXISTS comments(
  id TEXT PRIMARY KEY,
  checkin_id TEXT NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wishlist(
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drink_id TEXT NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, drink_id)
);
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
`);

const q = (sql) => db.prepare(sql);
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

if (!q('SELECT value FROM meta WHERE key = ?').get('seeded')) {
  const now = Date.now();
  const ins = q('INSERT OR IGNORE INTO drinks(id,name,brand,category,sugar_free,caffeine,note,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,\'\',NULL,?,?)');
  tx(() => {
    for (const [id, name, brand, cat, sf, caf] of SEED_DRINKS) ins.run(id, name, brand, cat, sf ? 1 : 0, caf, now, now);
    q('INSERT INTO meta(key,value) VALUES (?,?)').run('seeded', String(now));
  });
  console.log(`Katalog mit ${SEED_DRINKS.length} Drinks angelegt.`);
}

let dataVersion = Date.now();
const bump = () => { dataVersion = Math.max(Date.now(), dataVersion + 1); };

/* ------------------------------------------------------------------ constants & validation */
const CATEGORIES = new Set(['cola', 'cola-mix', 'mate', 'limo', 'bio', 'schorle', 'eistee', 'energy', 'bitter', 'ginger', 'malz', 'sonst']);
const SERVINGS = new Set(['', 'Glasflasche', 'PET-Flasche', 'Dose', 'Im Glas', 'Postmix']);
const COLORS = ['#D42E63', '#15594F', '#2E4CBC', '#C45A0C', '#655892', '#3B7F4C', '#A33B2A', '#2C6E92', '#843C86', '#8C6B16', '#B8325E', '#45545F'];
const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const newId = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function normEAN(raw) {
  let c = String(raw || '').replace(/\D/g, '');
  if (c.length === 12) c = '0' + c;
  return c;
}
function eanValid(code) {
  if (!/^(\d{8}|\d{13})$/.test(code)) return false;
  const d = code.split('').map(Number); const check = d.pop();
  let sum = 0; d.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === check;
}
function slug(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'drink';
}
function cleanImageUrl(u) {
  if (typeof u !== 'string' || !u) return null;
  try { const x = new URL(u); return (x.protocol === 'https:' && x.hostname === 'images.openfoodfacts.org') ? x.href : null; }
  catch { return null; }
}

/* ------------------------------------------------------------------ passwords & sessions */
function scrypt(pw, salt) {
  return new Promise((res, rej) => crypto.scrypt(pw, salt, 32, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k)));
}
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
async function verifyPassword(pw, stored) {
  const [alg, s, k] = String(stored).split('$');
  if (alg !== 'scrypt' || !s || !k) return false;
  const key = await scrypt(pw, Buffer.from(s, 'base64'));
  const ref = Buffer.from(k, 'base64');
  return ref.length === key.length && crypto.timingSafeEqual(ref, key);
}
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
function safeEqual(a, b) {
  const x = Buffer.from(sha256(String(a))), y = Buffer.from(sha256(String(b)));
  return crypto.timingSafeEqual(x, y);
}
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function isHttps(req) {
  if (COOKIE_SECURE === 'true') return true;
  if (COOKIE_SECURE === 'false') return false;
  return TRUST_PROXY && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}
function setSessionCookie(req, res, token, maxAgeSec) {
  const parts = [`zisch_session=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  q('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').run(sha256(token), userId, now, now + SESSION_DAYS * 86400000);
  setSessionCookie(req, res, token, SESSION_DAYS * 86400);
}
function currentUser(req) {
  const token = parseCookies(req).zisch_session;
  if (!token || token.length > 100) return null;
  const row = q('SELECT u.* , s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?').get(sha256(token));
  if (!row || row.expires_at < Date.now()) return null;
  return row;
}
const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.display_name, color: u.color, avatarId: u.avatar_id, isAdmin: !!u.is_admin, createdAt: u.created_at });

/* ------------------------------------------------------------------ rate limit (login/register) */
const attempts = new Map();
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}
function rateLimit(req, key, max = 10, windowMs = 10 * 60000) {
  const k = key + '|' + clientIp(req); const now = Date.now();
  const list = (attempts.get(k) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) fail(429, 'Zu viele Versuche. Warte ein paar Minuten und probier es dann nochmal.');
  list.push(now); attempts.set(k, list);
}
setInterval(() => {
  const now = Date.now();
  for (const [k, l] of attempts) if (!l.some((t) => now - t < 10 * 60000)) attempts.delete(k);
  q('DELETE FROM sessions WHERE expires_at < ?').run(now);
}, 10 * 60000).unref();

/* ------------------------------------------------------------------ request helpers */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Die Datei ist zu groß.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const buf = await readBody(req, 64 * 1024);
  if (!buf.length) return {};
  try { const v = JSON.parse(buf.toString('utf8')); return v && typeof v === 'object' ? v : {}; }
  catch { fail(400, 'Ungültige Anfrage.'); }
}
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

/* ------------------------------------------------------------------ data assembly */
function drinkRows() {
  const codes = new Map();
  for (const b of q('SELECT code, drink_id FROM barcodes ORDER BY created_at').all()) {
    if (!codes.has(b.drink_id)) codes.set(b.drink_id, []);
    codes.get(b.drink_id).push(b.code);
  }
  return q('SELECT * FROM drinks').all().map((d) => ({
    id: d.id, name: d.name, brand: d.brand, category: d.category, sugarFree: !!d.sugar_free,
    caffeine: d.caffeine, note: d.note, imageUrl: d.image_url, createdBy: d.created_by, createdAt: d.created_at,
    barcodes: codes.get(d.id) || [],
  }));
}
function checkinRows(limit = 2000) {
  const rows = q('SELECT * FROM checkins ORDER BY created_at DESC LIMIT ?').all(limit);
  const toasts = new Map(), comments = new Map();
  for (const t of q('SELECT checkin_id, user_id FROM toasts ORDER BY created_at').all()) {
    if (!toasts.has(t.checkin_id)) toasts.set(t.checkin_id, []);
    toasts.get(t.checkin_id).push(t.user_id);
  }
  for (const c of q('SELECT * FROM comments ORDER BY created_at').all()) {
    if (!comments.has(c.checkin_id)) comments.set(c.checkin_id, []);
    comments.get(c.checkin_id).push({ id: c.id, userId: c.user_id, text: c.text, createdAt: c.created_at });
  }
  return rows.map((c) => ({
    id: c.id, drinkId: c.drink_id, userId: c.user_id, rating: c.rating, comment: c.comment, photoId: c.photo_id,
    serving: c.serving, place: c.place, badges: safeParse(c.badges), createdAt: c.created_at, editedAt: c.edited_at,
    toasts: toasts.get(c.id) || [], comments: comments.get(c.id) || [],
  }));
}
function safeParse(s) { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; } }

async function removeUploadFile(id) {
  if (!id || !ID_RE.test(id)) return;
  const stillUsed = q('SELECT 1 FROM checkins WHERE photo_id = ? UNION SELECT 1 FROM users WHERE avatar_id = ?').get(id, id);
  if (stillUsed) return;
  q('DELETE FROM uploads WHERE id = ?').run(id);
  await fsp.rm(path.join(UPLOAD_DIR, id + '.jpg'), { force: true });
}
function ownUpload(user, id) {
  if (id == null || id === '') return null;
  if (typeof id !== 'string' || !ID_RE.test(id)) fail(400, 'Ungültiges Foto.');
  const row = q('SELECT user_id FROM uploads WHERE id = ?').get(id);
  if (!row || row.user_id !== user.id) fail(400, 'Dieses Foto gehört nicht zu deinem Konto.');
  return id;
}

/* ------------------------------------------------------------------ Open Food Facts lookup */
const offCache = new Map();
function guessCategory(p) {
  const name = `${p.product_name_de || ''} ${p.product_name || ''} ${p.generic_name_de || ''}`.toLowerCase();
  const tags = (p.categories_tags || []).join(' ');
  const has = (re) => re.test(name) || re.test(tags);
  if (/spezi|mezzo|cola[- ]?mix|schwip/.test(name)) return 'cola-mix';
  if (has(/energy/)) return 'energy';
  if (has(/\bmate\b|yerba|mate-/)) return 'mate';
  if (has(/schorle|spritzer/)) return 'schorle';
  if (has(/eistee|ice[- ]?tea|iced-tea/)) return 'eistee';
  if (has(/tonic|bitter[- ]?lemon/)) return 'bitter';
  if (has(/ginger/)) return 'ginger';
  if (has(/malz|malt/)) return 'malz';
  if (has(/cola|kola/)) return 'cola';
  if ((p.labels_tags || []).some((t) => /organic|bio/.test(t)) && has(/limo|lemonade|soda/)) return 'bio';
  if (has(/limo|lemonade|soda|orange|zitrone|brause/)) return 'limo';
  return 'sonst';
}
async function lookupOFF(code) {
  if (offCache.has(code)) return offCache.get(code);
  const fields = 'product_name,product_name_de,generic_name_de,brands,categories_tags,labels_tags,image_front_small_url,image_front_url,quantity,nutriments';
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`, {
      headers: { 'User-Agent': 'Zisch/1.0 (self-hosted soft drink check-in app)' }, signal: ctrl.signal,
    });
    if (!r.ok) { const out = { found: false }; if (r.status === 404) offCache.set(code, out); return out; }
    const j = await r.json();
    const p = j && j.product;
    if (!p || j.status === 0) { const out = { found: false }; offCache.set(code, out); return out; }
    const name = (p.product_name_de || p.product_name || '').trim();
    const brand = String(p.brands || '').split(',')[0].trim();
    const n = p.nutriments || {};
    const sugars = Number(n.sugars_100g);
    const sugarFree = (Number.isFinite(sugars) && sugars <= 0.5) || /zero|light|ohne zucker|zuckerfrei|sugar ?free/i.test(name);
    let caffeine = null;
    const cf = Number(n.caffeine_100g);
    if (Number.isFinite(cf) && cf > 0) caffeine = Math.round(cf < 1 ? cf * 1000 : cf);
    const out = {
      found: !!name, name, brand, quantity: p.quantity || '', category: guessCategory(p), sugarFree, caffeine,
      imageUrl: cleanImageUrl(p.image_front_small_url || p.image_front_url || ''),
    };
    offCache.set(code, out);
    return out;
  } catch {
    return { found: false, error: 'Open Food Facts ist gerade nicht erreichbar.' };
  } finally { clearTimeout(t); }
}

/* ------------------------------------------------------------------ routes */
const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler, auth: opts.auth !== false });
};

route('POST', '/api/register', async (req, res) => {
  rateLimit(req, 'register', 8);
  const b = await readJson(req);
  const username = str(b.username, 40), displayName = str(b.displayName, 40) || username;
  const password = typeof b.password === 'string' ? b.password : '';
  const userCount = q('SELECT COUNT(*) n FROM users').get().n;
  if (userCount > 0) {
    if (!INVITE_CODE) fail(403, 'Registrierung ist geschlossen. Die Person, die Zisch betreibt, muss erst einen Einladungscode festlegen.');
    if (!safeEqual(str(b.invite, 200), INVITE_CODE)) fail(403, 'Der Einladungscode stimmt nicht.');
  } else if (INVITE_CODE && !safeEqual(str(b.invite, 200), INVITE_CODE)) {
    fail(403, 'Der Einladungscode stimmt nicht.');
  }
  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) fail(400, 'Benutzername: 3 bis 24 Zeichen, nur Buchstaben, Ziffern, Punkt, Minus und Unterstrich.');
  if (password.length < 8) fail(400, 'Das Passwort braucht mindestens 8 Zeichen.');
  if (password.length > 200) fail(400, 'Das Passwort ist zu lang.');
  if (q('SELECT 1 FROM users WHERE username = ?').get(username)) fail(409, 'Diesen Benutzernamen gibt es schon.');
  const id = 'u_' + newId(12);
  const color = COLORS[parseInt(sha256(username).slice(0, 6), 16) % COLORS.length];
  const hash = await hashPassword(password);
  q('INSERT INTO users(id,username,display_name,pass_hash,color,is_admin,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, username, displayName, hash, color, userCount === 0 ? 1 : 0, Date.now());
  createSession(req, res, id);
  bump();
  sendJson(res, 201, { user: publicUser(q('SELECT * FROM users WHERE id = ?').get(id)) });
}, { auth: false });

route('POST', '/api/login', async (req, res) => {
  rateLimit(req, 'login', 10);
  const b = await readJson(req);
  const u = q('SELECT * FROM users WHERE username = ?').get(str(b.username, 40));
  const ok = u ? await verifyPassword(String(b.password || ''), u.pass_hash) : await hashPassword('dummy').then(() => false);
  if (!ok) fail(401, 'Benutzername oder Passwort stimmt nicht.');
  createSession(req, res, u.id);
  sendJson(res, 200, { user: publicUser(u) });
}, { auth: false });

route('POST', '/api/logout', async (req, res) => {
  const token = parseCookies(req).zisch_session;
  if (token) q('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  setSessionCookie(req, res, '', 0);
  sendJson(res, 200, { ok: true });
}, { auth: false });

route('GET', '/api/me', async (req, res, p, user) => {
  sendJson(res, 200, { user: publicUser(user), registrationOpen: !!INVITE_CODE });
});

route('PATCH', '/api/me', async (req, res, p, user) => {
  const b = await readJson(req);
  if ('displayName' in b) {
    const dn = str(b.displayName, 40);
    if (!dn) fail(400, 'Der Anzeigename darf nicht leer sein.');
    q('UPDATE users SET display_name = ? WHERE id = ?').run(dn, user.id);
  }
  if ('avatarId' in b) {
    const id = b.avatarId ? ownUpload(user, b.avatarId) : null;
    const old = user.avatar_id;
    q('UPDATE users SET avatar_id = ? WHERE id = ?').run(id, user.id);
    if (old && old !== id) await removeUploadFile(old);
  }
  if (b.newPassword !== undefined) {
    if (!(await verifyPassword(String(b.currentPassword || ''), user.pass_hash))) fail(403, 'Das aktuelle Passwort stimmt nicht.');
    const np = String(b.newPassword);
    if (np.length < 8 || np.length > 200) fail(400, 'Das neue Passwort braucht mindestens 8 Zeichen.');
    q('UPDATE users SET pass_hash = ? WHERE id = ?').run(await hashPassword(np), user.id);
  }
  bump();
  sendJson(res, 200, { user: publicUser(q('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

route('GET', '/api/version', async (req, res) => sendJson(res, 200, { version: dataVersion }));

route('GET', '/api/data', async (req, res, p, user) => {
  sendJson(res, 200, {
    version: dataVersion,
    me: publicUser(user),
    users: q('SELECT * FROM users').all().map(publicUser),
    drinks: drinkRows(),
    checkins: checkinRows(),
    wishlist: q('SELECT drink_id FROM wishlist WHERE user_id = ? ORDER BY created_at DESC').all(user.id).map((r) => r.drink_id),
  });
});

function drinkBody(b, partial) {
  const out = {};
  if (!partial || 'name' in b) { out.name = str(b.name, 60); if (!out.name) fail(400, 'Gib dem Drink einen Namen.'); }
  if (!partial || 'brand' in b) { out.brand = str(b.brand, 50); if (!out.brand) fail(400, 'Trag den Hersteller ein.'); }
  if (!partial || 'category' in b) { out.category = CATEGORIES.has(b.category) ? b.category : 'sonst'; }
  if (!partial || 'sugarFree' in b) out.sugar_free = b.sugarFree ? 1 : 0;
  if (!partial || 'caffeine' in b) {
    const c = b.caffeine === null || b.caffeine === '' || b.caffeine === undefined ? null : Math.round(Number(b.caffeine));
    out.caffeine = Number.isFinite(c) ? Math.max(0, Math.min(100, c)) : null;
  }
  if (!partial || 'note' in b) out.note = str(b.note, 240);
  if (!partial || 'imageUrl' in b) out.image_url = cleanImageUrl(b.imageUrl);
  return out;
}
function setBarcodes(drinkId, list, userId) {
  if (!Array.isArray(list)) return;
  const codes = [...new Set(list.map(normEAN))];
  for (const c of codes) {
    if (!eanValid(c)) fail(400, `${c} ist kein gültiger Barcode.`);
    const other = q('SELECT d.name FROM barcodes b JOIN drinks d ON d.id = b.drink_id WHERE b.code = ? AND b.drink_id != ?').get(c, drinkId);
    if (other) fail(409, `Der Barcode ${c} gehört schon zu ${other.name}.`);
  }
  q('DELETE FROM barcodes WHERE drink_id = ?').run(drinkId);
  const ins = q('INSERT INTO barcodes(code,drink_id,added_by,created_at) VALUES (?,?,?,?)');
  for (const c of codes) ins.run(c, drinkId, userId, Date.now());
}

route('POST', '/api/drinks', async (req, res, p, user) => {
  const b = await readJson(req);
  const d = drinkBody(b, false);
  const dupe = q('SELECT name FROM drinks WHERE lower(name) = lower(?) AND lower(brand) = lower(?)').get(d.name, d.brand);
  if (dupe) fail(409, `„${dupe.name}“ von ${d.brand} gibt es schon.`);
  let id = slug(d.name);
  while (q('SELECT 1 FROM drinks WHERE id = ?').get(id)) id = slug(d.name) + '-' + newId(3).toLowerCase().replace(/[^a-z0-9]/g, 'x');
  const now = Date.now();
  tx(() => {
    q('INSERT INTO drinks(id,name,brand,category,sugar_free,caffeine,note,image_url,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, d.name, d.brand, d.category, d.sugar_free, d.caffeine, d.note, d.image_url, user.id, now, now);
    setBarcodes(id, b.barcodes || [], user.id);
  });
  bump();
  sendJson(res, 201, { id });
});

route('PATCH', '/api/drinks/:id', async (req, res, p, user) => {
  const cur = q('SELECT * FROM drinks WHERE id = ?').get(p.id);
  if (!cur) fail(404, 'Diesen Drink gibt es nicht mehr.');
  const b = await readJson(req);
  const d = drinkBody(b, true);
  const name = d.name ?? cur.name, brand = d.brand ?? cur.brand;
  const dupe = q('SELECT name FROM drinks WHERE lower(name) = lower(?) AND lower(brand) = lower(?) AND id != ?').get(name, brand, p.id);
  if (dupe) fail(409, `„${dupe.name}“ von ${brand} gibt es schon.`);
  tx(() => {
    const cols = Object.keys(d);
    if (cols.length) q(`UPDATE drinks SET ${cols.map((c) => c + ' = ?').join(', ')}, updated_at = ? WHERE id = ?`).run(...cols.map((c) => d[c]), Date.now(), p.id);
    if ('barcodes' in b) setBarcodes(p.id, b.barcodes, user.id);
  });
  bump();
  sendJson(res, 200, { ok: true });
});

route('DELETE', '/api/drinks/:id', async (req, res, p, user) => {
  const d = q('SELECT * FROM drinks WHERE id = ?').get(p.id);
  if (!d) fail(404, 'Diesen Drink gibt es nicht mehr.');
  if (d.created_by !== user.id && !user.is_admin) fail(403, 'Nur wer den Drink angelegt hat, kann ihn löschen.');
  if (q('SELECT 1 FROM checkins WHERE drink_id = ?').get(p.id)) fail(409, 'Der Drink hat schon Check-ins und kann nicht gelöscht werden.');
  q('DELETE FROM drinks WHERE id = ?').run(p.id);
  bump();
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/drinks/:id/barcodes', async (req, res, p, user) => {
  if (!q('SELECT 1 FROM drinks WHERE id = ?').get(p.id)) fail(404, 'Diesen Drink gibt es nicht mehr.');
  const code = normEAN((await readJson(req)).code);
  if (!eanValid(code)) fail(400, 'Das ist kein gültiger Barcode.');
  const owner = q('SELECT b.drink_id, d.name FROM barcodes b JOIN drinks d ON d.id = b.drink_id WHERE b.code = ?').get(code);
  if (owner && owner.drink_id !== p.id) fail(409, `Der Barcode gehört schon zu ${owner.name}.`);
  if (!owner) q('INSERT INTO barcodes(code,drink_id,added_by,created_at) VALUES (?,?,?,?)').run(code, p.id, user.id, Date.now());
  bump();
  sendJson(res, 200, { ok: true });
});

route('GET', '/api/lookup/:code', async (req, res, p) => {
  const code = normEAN(p.code);
  if (!eanValid(code)) fail(400, 'Das ist kein gültiger Barcode.');
  const local = q('SELECT drink_id FROM barcodes WHERE code = ?').get(code);
  if (local) return sendJson(res, 200, { local: local.drink_id });
  if (!OFF_LOOKUP) return sendJson(res, 200, { found: false });
  sendJson(res, 200, await lookupOFF(code));
});

function checkinBody(b, user) {
  const out = {};
  if ('rating' in b) {
    if (b.rating === null || b.rating === 0 || b.rating === '') out.rating = null;
    else {
      const r = Number(b.rating);
      if (!Number.isFinite(r) || r < 0.25 || r > 5 || Math.round(r * 4) !== r * 4) fail(400, 'Die Bewertung geht von 0,25 bis 5 in Viertelschritten.');
      out.rating = r;
    }
  }
  if ('comment' in b) out.comment = str(b.comment, 280);
  if ('serving' in b) { if (!SERVINGS.has(b.serving || '')) fail(400, 'Unbekannte Serviert-als-Angabe.'); out.serving = b.serving || ''; }
  if ('place' in b) out.place = str(b.place, 60);
  if ('photoId' in b) out.photo_id = ownUpload(user, b.photoId);
  return out;
}

route('POST', '/api/checkins', async (req, res, p, user) => {
  const b = await readJson(req);
  if (!q('SELECT 1 FROM drinks WHERE id = ?').get(String(b.drinkId || ''))) fail(400, 'Diesen Drink gibt es nicht.');
  const c = checkinBody({ rating: null, comment: '', serving: '', place: '', photoId: null, ...b }, user);
  const badges = Array.isArray(b.badges) ? b.badges.filter((x) => typeof x === 'string' && /^[a-z-]{1,30}$/.test(x)).slice(0, 30) : [];
  const id = newId(9);
  q('INSERT INTO checkins(id,drink_id,user_id,rating,comment,photo_id,serving,place,badges,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, b.drinkId, user.id, c.rating, c.comment, c.photo_id, c.serving, c.place, JSON.stringify(badges), Date.now());
  bump();
  sendJson(res, 201, { id });
});

route('PATCH', '/api/checkins/:id', async (req, res, p, user) => {
  const cur = q('SELECT * FROM checkins WHERE id = ?').get(p.id);
  if (!cur) fail(404, 'Diesen Check-in gibt es nicht mehr.');
  if (cur.user_id !== user.id) fail(403, 'Du kannst nur deine eigenen Check-ins bearbeiten.');
  const b = await readJson(req);
  const c = checkinBody(b, user);
  const cols = Object.keys(c);
  if (cols.length) q(`UPDATE checkins SET ${cols.map((k) => k + ' = ?').join(', ')}, edited_at = ? WHERE id = ?`).run(...cols.map((k) => c[k]), Date.now(), p.id);
  if ('photo_id' in c && cur.photo_id && cur.photo_id !== c.photo_id) await removeUploadFile(cur.photo_id);
  bump();
  sendJson(res, 200, { ok: true });
});

route('DELETE', '/api/checkins/:id', async (req, res, p, user) => {
  const cur = q('SELECT * FROM checkins WHERE id = ?').get(p.id);
  if (!cur) fail(404, 'Diesen Check-in gibt es nicht mehr.');
  if (cur.user_id !== user.id && !user.is_admin) fail(403, 'Du kannst nur deine eigenen Check-ins löschen.');
  q('DELETE FROM checkins WHERE id = ?').run(p.id);
  if (cur.photo_id) await removeUploadFile(cur.photo_id);
  bump();
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/checkins/:id/toast', async (req, res, p, user) => {
  if (!q('SELECT 1 FROM checkins WHERE id = ?').get(p.id)) fail(404, 'Diesen Check-in gibt es nicht mehr.');
  const has = q('SELECT 1 FROM toasts WHERE checkin_id = ? AND user_id = ?').get(p.id, user.id);
  if (has) q('DELETE FROM toasts WHERE checkin_id = ? AND user_id = ?').run(p.id, user.id);
  else q('INSERT INTO toasts(checkin_id,user_id,created_at) VALUES (?,?,?)').run(p.id, user.id, Date.now());
  bump();
  sendJson(res, 200, { toasted: !has });
});

route('POST', '/api/checkins/:id/comments', async (req, res, p, user) => {
  if (!q('SELECT 1 FROM checkins WHERE id = ?').get(p.id)) fail(404, 'Diesen Check-in gibt es nicht mehr.');
  const text = str((await readJson(req)).text, 280);
  if (!text) fail(400, 'Der Kommentar ist leer.');
  const id = newId(9);
  q('INSERT INTO comments(id,checkin_id,user_id,text,created_at) VALUES (?,?,?,?,?)').run(id, p.id, user.id, text, Date.now());
  bump();
  sendJson(res, 201, { id });
});

route('DELETE', '/api/comments/:id', async (req, res, p, user) => {
  const c = q('SELECT c.*, k.user_id AS owner FROM comments c JOIN checkins k ON k.id = c.checkin_id WHERE c.id = ?').get(p.id);
  if (!c) fail(404, 'Diesen Kommentar gibt es nicht mehr.');
  if (c.user_id !== user.id && c.owner !== user.id && !user.is_admin) fail(403, 'Diesen Kommentar kannst du nicht löschen.');
  q('DELETE FROM comments WHERE id = ?').run(p.id);
  bump();
  sendJson(res, 200, { ok: true });
});

route('PUT', '/api/wishlist/:drinkId', async (req, res, p, user) => {
  if (!q('SELECT 1 FROM drinks WHERE id = ?').get(p.drinkId)) fail(404, 'Diesen Drink gibt es nicht mehr.');
  q('INSERT OR IGNORE INTO wishlist(user_id,drink_id,created_at) VALUES (?,?,?)').run(user.id, p.drinkId, Date.now());
  sendJson(res, 200, { ok: true });
});
route('DELETE', '/api/wishlist/:drinkId', async (req, res, p, user) => {
  q('DELETE FROM wishlist WHERE user_id = ? AND drink_id = ?').run(user.id, p.drinkId);
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/uploads', async (req, res, p, user) => {
  rateLimit(req, 'upload:' + user.id, 60, 10 * 60000);
  const type = String(req.headers['content-type'] || '').split(';')[0].trim();
  if (type !== 'image/jpeg') fail(415, 'Bitte lade ein Foto als JPEG hoch.');
  const buf = await readBody(req, 10 * 1024 * 1024);
  if (buf.length < 100 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) fail(415, 'Das ist kein gültiges JPEG-Foto.');
  const id = newId(16);
  await fsp.writeFile(path.join(UPLOAD_DIR, id + '.jpg'), buf);
  q('INSERT INTO uploads(id,user_id,created_at) VALUES (?,?,?)').run(id, user.id, Date.now());
  sendJson(res, 201, { id });
});

route('GET', '/healthz', async (req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); }, { auth: false });

/* ------------------------------------------------------------------ static files */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};
const VENDOR = {
  '/vendor/zxing.min.js': path.join(ROOT, 'node_modules/@zxing/library/umd/index.min.js'),
};
const FONT_DIRS = ['figtree', 'shrikhand', 'ibm-plex-mono'].map((f) => path.join(ROOT, 'node_modules/@fontsource', f, 'files'));
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://images.openfoodfacts.org",
  "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ');

async function sendFile(res, file, cache) {
  try {
    const st = await fsp.stat(file);
    if (!st.isFile()) return false;
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
    return true;
  } catch { return false; }
}

async function serveStatic(req, res, pathname) {
  if (pathname.startsWith('/uploads/')) {
    const id = pathname.slice(9).replace(/\.jpg$/, '');
    if (!ID_RE.test(id)) return false;
    return sendFile(res, path.join(UPLOAD_DIR, id + '.jpg'), 'public, max-age=31536000, immutable');
  }
  if (VENDOR[pathname]) return sendFile(res, VENDOR[pathname], 'public, max-age=604800');
  if (pathname.startsWith('/fonts/')) {
    const name = pathname.slice(7);
    if (!/^[a-z0-9-]+\.woff2$/.test(name)) return false;
    for (const dir of FONT_DIRS) if (await sendFile(res, path.join(dir, name), 'public, max-age=31536000, immutable')) return true;
    return false;
  }
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (rel.includes('..') || rel.includes('\0')) return false;
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) return false;
  return sendFile(res, file, rel === 'index.html' ? 'no-cache' : 'public, max-age=3600');
}

/* ------------------------------------------------------------------ server */
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
  try {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { fail(400, 'Ungültige Adresse.'); }
    if (pathname.startsWith('/api/') || pathname === '/healthz') {
      if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'zisch') fail(403, 'Anfrage abgelehnt.');
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(pathname); if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        const user = currentUser(req);
        if (r.auth && !user) fail(401, 'Bitte melde dich an.');
        await r.handler(req, res, params, user);
        return;
      }
      fail(404, 'Nicht gefunden.');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'Nicht erlaubt.');
    if (await serveStatic(req, res, pathname)) return;
    if (!path.extname(pathname)) { if (await serveStatic(req, res, '/')) return; }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Nicht gefunden');
  } catch (e) {
    if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
    if (String(e && e.message).includes('FOREIGN KEY')) return sendJson(res, 409, { error: 'Das geht nicht, weil noch Einträge daran hängen.' });
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: 'Auf dem Server ist etwas schiefgelaufen.' });
    else res.end();
  }
});

/* clean up photos that were uploaded but never used (older than a day) */
async function sweepUploads() {
  const old = q(`SELECT id FROM uploads WHERE created_at < ? AND id NOT IN (SELECT photo_id FROM checkins WHERE photo_id IS NOT NULL)
                 AND id NOT IN (SELECT avatar_id FROM users WHERE avatar_id IS NOT NULL)`).all(Date.now() - 86400000);
  for (const { id } of old) await removeUploadFile(id);
}
sweepUploads().catch(() => {});
setInterval(() => sweepUploads().catch(() => {}), 6 * 3600000).unref();

if (!INVITE_CODE) console.warn('Achtung: INVITE_CODE ist nicht gesetzt. Nur das allererste Konto kann sich registrieren.');
if (!fs.existsSync(VENDOR['/vendor/zxing.min.js'])) console.warn('Hinweis: Barcode-Bibliothek nicht lokal gefunden, die App lädt sie bei Bedarf von einem CDN.');
server.listen(PORT, () => console.log(`Zisch läuft auf Port ${PORT}, Daten in ${DATA_DIR}`));
const shutdown = () => { server.close(); try { db.close(); } catch {} process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
