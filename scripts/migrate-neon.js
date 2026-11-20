const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let connectionString = process.env.DATABASE_URL;
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      connectionString = trimmed.replace('DATABASE_URL=', '').replace(/^["']|["']$/g, '').trim();
    }
  }
}

console.log('Connecting to database...');

async function migrate() {
  const sql = neon(connectionString);

  // 1. Check basic connection
  const check = await sql('SELECT NOW() as server_time, current_database() as db;');
  console.log('Connected to:', check[0]);

  // 2. Read migration file
  const migrationFile = path.resolve(process.cwd(), 'src/db/migrations/0000_funny_baron_zemo.sql');
  const content = fs.readFileSync(migrationFile, 'utf8');
  const statements = content.split('--> statement-breakpoint');

  console.log(`Applying ${statements.length} migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    try {
      await sql(stmt);
      console.log(`  [OK] Statement ${i + 1}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  [SKIP] Statement ${i + 1} (already exists)`);
      } else {
        console.warn(`  [WARN] Statement ${i + 1}: ${err.message}`);
      }
    }
  }

  // 3. Final verification of all tables
  const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  console.log('\nSUCCESS! Database connection verified and active.');
  console.log('Tables present in database:');
  tables.forEach(t => console.log(' - ' + t.table_name));
}

migrate().catch(console.error);
