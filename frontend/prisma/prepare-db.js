/**
 * Auto-detects database provider from DATABASE_URL and configures Prisma schema.
 * Ensures seamless support for PostgreSQL (Production / Docker) and SQLite (Local).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

console.log(`[prisma-prepare] Detected database URL protocol. Target provider: ${targetProvider}`);

const currentProviderMatch = schema.match(/provider\s*=\s*"(sqlite|postgresql)"/);
const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;

if (currentProvider !== targetProvider) {
  schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${targetProvider}"`);
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log(`[prisma-prepare] Updated schema.prisma datasource provider: ${currentProvider} -> ${targetProvider}`);
} else {
  console.log(`[prisma-prepare] schema.prisma already configured for: ${targetProvider}`);
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

try {
  console.log('[prisma-prepare] Generating Prisma Client...');
  execSync(`${npxCmd} prisma generate`, { stdio: 'inherit', shell: true });
  console.log('[prisma-prepare] Prisma Client successfully generated.');
} catch (err) {
  console.error('[prisma-prepare] Error generating Prisma client:', err);
  process.exit(1);
}
