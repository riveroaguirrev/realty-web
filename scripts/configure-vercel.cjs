// Run before committing/deploying: Vercel reads routing before the build starts.
const fs = require('node:fs')
const path = require('node:path')

const input = process.argv[2]
if (!input) throw new Error('Uso: npm run deploy:configure -- https://TU-BACKEND.vercel.app')
const url = new URL(input)
if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || url.hostname.endsWith('.invalid') || ['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('Indica el origen HTTPS del backend, sin rutas, credenciales ni parámetros.')
}
const target = path.join(__dirname, '../packages/frontend/vercel.json')
const config = JSON.parse(fs.readFileSync(target, 'utf8'))
config.rewrites[0].destination = url.origin + '/api/:path*'
fs.writeFileSync(target, JSON.stringify(config, null, 2) + '\n')
console.log('Proxy /api configurado hacia ' + url.origin + '. Incluye vercel.json en tu próximo commit.')
