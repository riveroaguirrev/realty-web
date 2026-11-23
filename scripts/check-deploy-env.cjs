// Local builds use their usual .env.local files. Vercel must supply real cloud values.
if (process.env.VERCEL !== '1') process.exit(0)
const fs = require('node:fs')
const path = require('node:path')
const frontend = process.argv[2] === 'frontend'
const required = frontend
  ? ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_URL', 'VITE_MAPBOX_ACCESS_TOKEN']
  : ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_APP_URL', 'CORS_ALLOWED_ORIGINS']
const missing = required.filter(key => !process.env[key]?.trim())
if (missing.length) throw new Error('Variables de Vercel faltantes: ' + missing.join(', '))
function cloudUrl(value, protocols, label) {
  const url = new URL(value)
  if (!protocols.includes(url.protocol) || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.invalid')) throw new Error(label + ' debe apuntar al servicio de producción.')
}
cloudUrl(process.env[frontend ? 'VITE_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL'], ['https:'], 'Supabase')
if (frontend) {
  if (process.env.VITE_API_URL !== '/api') throw new Error('VITE_API_URL debe ser /api para conservar la cookie bajo el mismo dominio.')
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../packages/frontend/vercel.json'), 'utf8'))
  cloudUrl(config.rewrites[0].destination, ['https:'], 'Proxy: ejecuta npm run deploy:configure')
} else {
  cloudUrl(process.env.DATABASE_URL, ['postgres:', 'postgresql:'], 'DATABASE_URL')
  cloudUrl(process.env.NEXT_PUBLIC_APP_URL, ['https:'], 'NEXT_PUBLIC_APP_URL')
  for (const origin of process.env.CORS_ALLOWED_ORIGINS.split(',')) cloudUrl(origin.trim(), ['https:'], 'CORS_ALLOWED_ORIGINS')
}
console.log('Configuración de despliegue verificada (' + (frontend ? 'frontend' : 'backend') + ').')
