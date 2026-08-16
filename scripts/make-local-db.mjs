/**
 * Membuat file SQLite lokal di .local/finance.dev.db dari migrasi Drizzle terbaru,
 * lengkap dengan seed default — supaya skema bisa dijelajahi lewat DBeaver/VSCode.
 *
 * INI BUKAN DATA APP. Database asli hidup di sandbox HP/emulator;
 * file ini cuma sandbox untuk melihat struktur & mencoba query.
 *
 * Jalankan: npm run db:local
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, '.local', 'finance.dev.db');

if (existsSync(target)) rmSync(target);

const db = new DatabaseSync(target);
db.exec('PRAGMA foreign_keys = ON;');

const migrationsDir = join(root, 'drizzle');
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) db.exec(statement);
  }
  console.log('applied', file);
}

// Seed identik dengan src/db/seed.ts
const categories = [
  ['Makan & Minum', 'expense', '#F97316', 'makan'],
  ['Transport', 'expense', '#0EA5E9', 'transport'],
  ['Belanja', 'expense', '#A855F7', 'belanja'],
  ['Tagihan', 'expense', '#EF4444', 'tagihan'],
  ['Hiburan', 'expense', '#EC4899', 'hiburan'],
  ['Kesehatan', 'expense', '#14B8A6', 'kesehatan'],
  ['Lainnya', 'expense', '#64748B', 'lainnya'],
  ['Gaji', 'income', '#22C55E', 'gaji'],
  ['Bonus', 'income', '#84CC16', 'bonus'],
  ['Lainnya', 'income', '#64748B', 'lainnya'],
];

const insertCategory = db.prepare(
  'INSERT INTO categories (name,type,color,icon,is_default) VALUES (?,?,?,?,1)',
);
for (const category of categories) insertCategory.run(...category);

db.exec("INSERT INTO accounts (name,type,initial_balance) VALUES ('Dompet','cash',0)");
db.exec(
  `INSERT INTO settings (key,value) VALUES
   ('currency','IDR'),('currencyMinorUnits','0'),('theme','system'),('dataVersion','1')`,
);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
  .map((r) => r.name)
  .join(', ');

console.log('tabel :', tables);
console.log('file  :', target);
