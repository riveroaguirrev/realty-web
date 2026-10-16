// Reproducible isolated integration stack. Never uses the caller's DATABASE_URL.
const { spawn, spawnSync } = require('node:child_process')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')
const root = path.resolve(__dirname, '..')
const prefix = 'realty-accounts-test-' + process.pid + '-' + randomBytes(3).toString('hex')
const db = prefix + '-db', auth = prefix + '-auth', network = prefix + '-network'
const password = randomBytes(16).toString('hex')
const secret = randomBytes(32).toString('hex')
const created = []
const children = []
let networkCreated = false
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://postgres:' + password + '@127.0.0.1:59941/postgres',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:59942',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt.sign({ role: 'anon' }, secret, { expiresIn: '1h' }),
  SUPABASE_SERVICE_ROLE_KEY: jwt.sign({ role: 'service_role' }, secret, { expiresIn: '1h' }),
  RUN_ACCOUNT_INTEGRATION: '1',
  TSX_TSCONFIG_PATH: path.join(root, 'packages/backend/tsconfig.json'),
  CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:59943,http://localhost:59943',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:59943',
  BACKEND_PORT: '59947',
  // Next 14 incorrectly treats hoisted SWC entries as missing in npm workspaces.
  // Its compiler uses the correct installed optional dependency.
  NEXT_IGNORE_INCORRECT_LOCKFILE: '1',
}
env.VITE_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
env.VITE_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
env.VITE_API_URL = '/api'
function docker(args) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Docker failed')
  return result.stdout.trim()
}
function start(args, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  children.push(child)
  child.stdout.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr.on('data', (chunk) => process.stderr.write(chunk))
  return child
}
async function run(args, cwd = root) {
  const child = start(args, cwd)
  const status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
  if (status !== 0) throw new Error('Test command failed with status ' + status)
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 500))
async function ready(check, label) {
  for (let i = 0; i < 60; i++) {
    try { if (await check()) return } catch {}
    await pause()
  }
  throw new Error(label + ' did not become ready')
}
let cleaned = false
function cleanup() {
  if (cleaned) return
  cleaned = true
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
  for (const name of created.reverse()) spawnSync('docker', ['rm', '-f', '-v', name], { stdio: 'ignore' })
  if (networkCreated) spawnSync('docker', ['network', 'rm', network], { stdio: 'ignore' })
}
process.on('SIGINT', () => { cleanup(); process.exit(130) })
process.on('SIGTERM', () => { cleanup(); process.exit(143) })
async function main() {
  console.log('Starting isolated account integration tests (ports 59941–59947)')
  docker(['network', 'create', network])
  networkCreated = true
  docker(['run', '-d', '--name', db, '--label', 'realty.account-tests=true', '--network', network,
    '-e', 'POSTGRES_PASSWORD=' + password, '-p', '127.0.0.1:59941:5432', 'public.ecr.aws/supabase/postgres:17.11.0.002'])
  created.push(db)
  await ready(() => spawnSync('docker', ['exec', db, 'pg_isready', '-U', 'postgres']).status === 0, 'Database')
  docker(['exec', db, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-c', "ALTER ROLE supabase_auth_admin WITH PASSWORD '" + password + "';"])
  await run(['node_modules/prisma/build/index.js', 'generate', '--schema=prisma/schema.prisma'])
  await run(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema=prisma/schema.prisma'])
  start(['tests/helpers/mail-fixture.cjs'])
  const config = {
    GOTRUE_API_HOST: '0.0.0.0', GOTRUE_API_PORT: '9999', API_EXTERNAL_URL: 'http://127.0.0.1:59942/auth/v1',
    GOTRUE_SITE_URL: env.NEXT_PUBLIC_APP_URL, GOTRUE_DB_DRIVER: 'postgres',
    GOTRUE_DB_DATABASE_URL: 'postgres://supabase_auth_admin:' + password + '@' + db + ':5432/postgres?sslmode=disable',
    GOTRUE_DB_NAMESPACE: 'auth', GOTRUE_JWT_SECRET: secret, GOTRUE_JWT_ADMIN_ROLES: 'service_role', GOTRUE_JWT_AUD: 'authenticated',
    GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true', GOTRUE_MAILER_AUTOCONFIRM: 'false',
    GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED: 'true', GOTRUE_PASSWORD_MIN_LENGTH: '12',
    GOTRUE_SMTP_ADMIN_EMAIL: 'noreply@example.com', GOTRUE_SMTP_HOST: 'host.docker.internal', GOTRUE_SMTP_PORT: '59944',
    GOTRUE_SMTP_MAX_FREQUENCY: '1s', GOTRUE_RATE_LIMIT_EMAIL_SENT: '1000', GOTRUE_MAILER_OTP_LENGTH: '6', GOTRUE_MAILER_OTP_EXP: '600',
  }
  for (const purpose of ['CONFIRMATION', 'MAGIC_LINK', 'RECOVERY', 'EMAIL_CHANGE']) {
    config['GOTRUE_MAILER_TEMPLATES_' + purpose] = 'http://host.docker.internal:59942/templates/' + (purpose === 'EMAIL_CHANGE' ? 'email-change.html' : 'code.html')
  }
  docker(['run', '-d', '--name', auth, '--label', 'realty.account-tests=true', '--network', network,
    '--add-host', 'host.docker.internal:host-gateway', '-p', '127.0.0.1:59946:9999',
    ...Object.entries(config).flatMap(([key, value]) => ['-e', key + '=' + value]), 'public.ecr.aws/supabase/gotrue:v2.197.0'])
  created.push(auth)
  await ready(async () => (await fetch('http://127.0.0.1:59942/auth/v1/health')).ok, 'Auth')
  await run(['node_modules/prisma/build/index.js', 'db', 'execute', '--schema=prisma/schema.prisma', '--file=prisma/sql/realtime-messaging.sql'])
  await run(['node_modules/tsx/dist/cli.mjs', '--tsconfig', 'packages/backend/tsconfig.json', '--test', 'tests/validation.test.ts', 'tests/routes.test.ts', 'tests/integration.test.ts'])
  if (process.argv.includes('--e2e')) {
    const backend = path.join(root, 'packages/backend')
    const next = require.resolve('next/dist/bin/next', { paths: [backend] })
    start([next, 'dev', '--port', '59947'], backend)
    start([path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '59943', '--strictPort'], path.join(root, 'packages/frontend'))
    await ready(async () => (await fetch('http://127.0.0.1:59943/auth/register')).ok, 'Frontend')
    await ready(async () => (await fetch('http://127.0.0.1:59947')).ok, 'Backend')
    await run(['node_modules/@playwright/test/cli.js', 'test'])
  }
  console.log('Account integration tests completed')
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(cleanup)
