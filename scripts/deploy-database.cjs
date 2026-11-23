// Explicit release step; never run migrations concurrently in Vercel builds.
// Usage: node --env-file=.env.production.local scripts/deploy-database.cjs
const { spawnSync } = require('node:child_process')
const path = require('node:path')
if (!process.env.DIRECT_URL) throw new Error('Define DIRECT_URL con conexión directa o Session pooler (5432), no Transaction pooler.')
const url = new URL(process.env.DIRECT_URL)
if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.port === '6543' || url.searchParams.get('pgbouncer') === 'true') {
  throw new Error('DIRECT_URL debe admitir sesiones para aplicar migraciones.')
}
const root = path.join(__dirname, '..')
for (const args of [
  ['migrate', 'deploy', '--schema=prisma/schema.prisma'],
  ['db', 'execute', '--schema=prisma/schema.prisma', '--file=prisma/sql/realtime-messaging.sql'],
]) {
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
    cwd: root, stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL },
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log('Migraciones y políticas RLS/Realtime aplicadas.')
