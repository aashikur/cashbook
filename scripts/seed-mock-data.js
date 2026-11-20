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

async function seed() {
  console.log('Seeding mock data to Neon database...');
  const sql = neon(connectionString);

  const now = new Date().toISOString();

  // 1. Create or ensure Demo User (Alex Romanov)
  const userId = 'user_alex_romanov';
  console.log('1. Ensuring demo user: Alex Romanov...');
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, 'Alex Romanov', 'alex.romanov@example.com', true, ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET name = 'Alex Romanov', email = 'alex.romanov@example.com';
  `;

  // 2. Organization 1: Personal Finance
  const org1Id = 'org_personal_finance';
  console.log('2. Inserting Organization: Personal Finance...');
  await sql`
    INSERT INTO "organizations" (id, name, description, currency, owner_id, created_at, updated_at)
    VALUES (${org1Id}, 'Personal Finance', 'Personal budget, household & savings ledger', 'USD', ${userId}, ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET name = 'Personal Finance', currency = 'USD';
  `;

  await sql`
    INSERT INTO "org_members" (id, org_id, user_id, user_email, role, status, invited_by, joined_at)
    VALUES ('mem_pf_alex', ${org1Id}, ${userId}, 'alex.romanov@example.com', 'admin', 'active', ${userId}, ${now})
    ON CONFLICT (id) DO NOTHING;
  `;

  // 3. Organization 2: Orgina International
  const org2Id = 'org_orgina_international';
  console.log('3. Inserting Organization: Orgina International...');
  await sql`
    INSERT INTO "organizations" (id, name, description, currency, owner_id, created_at, updated_at)
    VALUES (${org2Id}, 'Orgina International', 'Global corporate operations, logistics & accounts', 'USD', ${userId}, ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET name = 'Orgina International', currency = 'USD';
  `;

  await sql`
    INSERT INTO "org_members" (id, org_id, user_id, user_email, role, status, invited_by, joined_at)
    VALUES ('mem_oi_alex', ${org2Id}, ${userId}, 'alex.romanov@example.com', 'admin', 'active', ${userId}, ${now})
    ON CONFLICT (id) DO NOTHING;
  `;

  // 4. Books for Personal Finance (Exactly matching the Reference UI Screen 1!)
  console.log('4. Inserting Books for Personal Finance...');
  const pfBooks = [
    { id: 'exp_jan_expenses', title: 'January expenses', category: 'Personal', totalSpent: 10000, logCount: 5 },
    { id: 'exp_groceries', title: 'Groceries', category: 'Household', totalSpent: 500, logCount: 3 },
    { id: 'exp_rent_paid', title: 'Rent paid', category: 'Housing', totalSpent: 15000, logCount: 1 },
    { id: 'exp_savings', title: 'Savings', category: 'Investment', totalSpent: 300, logCount: 2 },
    { id: 'exp_salary', title: 'Salary', category: 'Income', totalSpent: 50000, logCount: 1 },
    { id: 'exp_may_savings', title: 'May month savings', category: 'Investment', totalSpent: 24022, logCount: 4 },
    { id: 'exp_may_expenses', title: 'May expenses', category: 'Personal', totalSpent: 15000, logCount: 6 },
  ];

  for (const b of pfBooks) {
    await sql`
      INSERT INTO "expenses" (id, org_id, title, category, total_spent, log_count, is_archived, created_by, created_at, updated_at)
      VALUES (${b.id}, ${org1Id}, ${b.title}, ${b.category}, ${b.totalSpent}, ${b.logCount}, false, ${userId}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET title = ${b.title}, total_spent = ${b.totalSpent}, log_count = ${b.logCount};
    `;
  }

  // 5. Transactions for "January expenses" (Exactly matching Reference UI Screen 2!)
  console.log('5. Inserting Transactions for January expenses...');
  const janLogs = [
    { id: 'log_supermarket', note: 'Supermarket', amountPaisa: 50000, date: '2024-01-21', year: 2024, month: 1 },
    { id: 'log_family_dinner', note: 'Family dinner', amountPaisa: 150000, date: '2024-01-20', year: 2024, month: 1 },
    { id: 'log_book_shop', note: 'Book shop', amountPaisa: 30000, date: '2024-01-18', year: 2024, month: 1 },
    { id: 'log_freelance', note: 'Freelance', amountPaisa: 1500000, date: '2024-01-15', year: 2024, month: 1 },
    { id: 'log_jan_misc', note: 'January expenses', amountPaisa: 1000000, date: '2024-01-05', year: 2024, month: 1 },
  ];

  for (const l of janLogs) {
    await sql`
      INSERT INTO "daily_logs" (id, org_id, expense_id, amount_paisa, note, log_date, fiscal_year, fiscal_month, logged_by, created_at, updated_at)
      VALUES (${l.id}, ${org1Id}, 'exp_jan_expenses', ${l.amountPaisa}, ${l.note}, ${l.date}, ${l.year}, ${l.month}, ${userId}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET note = ${l.note}, amount_paisa = ${l.amountPaisa};
    `;
  }

  // 6. Books for Orgina International (Enterprise corporate ledgers)
  console.log('6. Inserting Books for Orgina International...');
  const oiBooks = [
    { id: 'exp_oi_logistics', title: 'Global Logistics & Freight', category: 'Operations', totalSpent: 125000, logCount: 4 },
    { id: 'exp_oi_lease', title: 'Corporate Headquarters Lease', category: 'Facilities', totalSpent: 45000, logCount: 2 },
    { id: 'exp_oi_cloud', title: 'Enterprise Cloud Infrastructure', category: 'Technology', totalSpent: 18500, logCount: 6 },
    { id: 'exp_oi_retainer', title: 'Quarterly Partner Retainers', category: 'Partnerships', totalSpent: 80000, logCount: 3 },
    { id: 'exp_oi_travel', title: 'Executive Travel & Lodging', category: 'Travel', totalSpent: 12400, logCount: 5 },
    { id: 'exp_oi_audit', title: 'Legal & Compliance Audit', category: 'Governance', totalSpent: 9500, logCount: 1 },
  ];

  for (const b of oiBooks) {
    await sql`
      INSERT INTO "expenses" (id, org_id, title, category, total_spent, log_count, is_archived, created_by, created_at, updated_at)
      VALUES (${b.id}, ${org2Id}, ${b.title}, ${b.category}, ${b.totalSpent}, ${b.logCount}, false, ${userId}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET title = ${b.title}, total_spent = ${b.totalSpent}, log_count = ${b.logCount};
    `;
  }

  // 7. Transactions for Orgina International "Global Logistics & Freight"
  console.log('7. Inserting Transactions for Orgina International...');
  const oiLogs = [
    { id: 'log_oi_air_cargo', note: 'Air Cargo Transit (SG to NY)', amountPaisa: 3500000, date: '2024-03-25', year: 2024, month: 3 },
    { id: 'log_oi_customs', note: 'Port Customs Clearance fee', amountPaisa: 1200000, date: '2024-03-22', year: 2024, month: 3 },
    { id: 'log_oi_warehousing', note: 'Warehousing 3PL contract', amountPaisa: 2800000, date: '2024-03-15', year: 2024, month: 3 },
    { id: 'log_oi_export_docs', note: 'Export documentation handling', amountPaisa: 500000, date: '2024-03-10', year: 2024, month: 3 },
  ];

  for (const l of oiLogs) {
    await sql`
      INSERT INTO "daily_logs" (id, org_id, expense_id, amount_paisa, note, log_date, fiscal_year, fiscal_month, logged_by, created_at, updated_at)
      VALUES (${l.id}, ${org2Id}, 'exp_oi_logistics', ${l.amountPaisa}, ${l.note}, ${l.date}, ${l.year}, ${l.month}, ${userId}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET note = ${l.note}, amount_paisa = ${l.amountPaisa};
    `;
  }

  console.log('\n========================================');
  console.log('SUCCESS! Mock seed data created:');
  console.log('User: Alex Romanov (alex.romanov@example.com)');
  console.log('Workspaces:');
  console.log('  1. Personal Finance (7 Books, Reference Matched)');
  console.log('  2. Orgina International (6 Corporate Books)');
  console.log('========================================');
}

seed().catch(console.error);
