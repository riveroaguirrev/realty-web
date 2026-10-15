/* Local-only demo data. Repeat safely without duplicating existing demo records. */
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const dotenv = require('dotenv')
const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')
const root = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(root, '.env.local') })
const credentialPath = path.join(root, '.env.demo.local')
const tag = 'realty-local-demo-v1'
const accounts = [
  ['lucia', 'Lucía', 'Mendoza', 'Cochabamba'],
  ['mateo', 'Mateo', 'Rojas', 'Cochabamba'],
  ['sofia', 'Sofía', 'Vargas', 'La Paz'],
  ['diego', 'Diego', 'Flores', 'La Paz'],
  ['camila', 'Camila', 'Suárez', 'Santa Cruz de la Sierra'],
  ['andres', 'Andrés', 'Salinas', 'Santa Cruz de la Sierra'],
].map(([name, firstName, lastName, city]) => ({ name, firstName, lastName, city, email: `${name}@demo.realty.test` }))
const photos = [
  'photo-1600585154340-be6161a56a0c', 'photo-1600607687920-4e2a09cf159d',
  'photo-1600566753086-00f18fb6b3ea', 'photo-1600047509807-ba8f99d2cdde',
  'photo-1600210492486-724fe5c67fb0', 'photo-1493809842364-78817add7ffb',
  'photo-1522708323590-d24dbb6b0267', 'photo-1560448204-e02f11c3d0e2',
]
const locations = [
  ['Cochabamba', 'Cochabamba', 'Queru Queru', -17.3695, -66.1542],
  ['Cochabamba', 'Cochabamba', 'Cala Cala', -17.3687, -66.1708],
  ['Cochabamba', 'Cochabamba', 'Recoleta', -17.3760, -66.1515],
  ['Cochabamba', 'Cochabamba', 'Centro', -17.3935, -66.1570],
  ['Cochabamba', 'Cochabamba', 'Sarco', -17.3783, -66.1860],
  ['Cochabamba', 'Cochabamba', 'Tupuraya', -17.3742, -66.1392],
  ['Cochabamba', 'Cochabamba', 'Mayorazgo', -17.3578, -66.1630],
  ['Cochabamba', 'Cochabamba', 'Muyurina', -17.3850, -66.1330],
  ['La Paz', 'La Paz', 'Sopocachi', -16.5114, -68.1297],
  ['La Paz', 'La Paz', 'Miraflores', -16.4980, -68.1205],
  ['La Paz', 'La Paz', 'Calacoto', -16.5385, -68.0848],
  ['La Paz', 'La Paz', 'San Miguel', -16.5420, -68.0775],
  ['Santa Cruz de la Sierra', 'Santa Cruz', 'Equipetrol', -17.7625, -63.1958],
  ['Santa Cruz de la Sierra', 'Santa Cruz', 'Urbarí', -17.8060, -63.1980],
  ['Santa Cruz de la Sierra', 'Santa Cruz', 'Las Palmas', -17.8100, -63.2050],
  ['Santa Cruz de la Sierra', 'Santa Cruz', 'Centro', -17.7833, -63.1821],
]
const variants = [
  ['APARTMENT', 'Departamento luminoso con balcón', 2, 2, 94],
  ['APARTMENT', 'Monoambiente moderno amoblado', 1, 1, 42],
  ['HOUSE', 'Casa familiar con jardín', 4, 3, 245],
  ['APARTMENT', 'Departamento amplio con vista', 3, 2, 138],
  ['OFFICE', 'Oficina con espacios de reunión', 0, 2, 110],
  ['APARTMENT', 'Departamento de estreno', 2, 2, 86],
  ['HOUSE', 'Casa con terraza y garaje', 3, 3, 190],
  ['COMMERCIAL', 'Local comercial a pie de calle', 0, 1, 75],
  ['APARTMENT', 'Penthouse con terraza privada', 3, 3, 175],
]
function makeProperty(i, advisorId, organizationId) {
  const cityIndex = i < 20 ? i % 8 : i < 28 ? 8 + i % 4 : 12 + i % 4
  const [city, region, zone, lat, lng] = locations[cityIndex]
  const [type, name, bedrooms, bathrooms, area] = variants[i % variants.length]
  const operation = ['SALE', 'RENTAL', 'ANTICRETIC'][Math.floor(i / 3) % 3]
  const currency = operation === 'RENTAL' && i % 2 === 0 ? 'BOB' : 'USD'
  const price = operation === 'SALE' ? 52000 + i * 5600 : operation === 'ANTICRETIC' ? 18000 + i * 1500 : currency === 'BOB' ? 1800 + i * 160 : 280 + i * 25
  const exact = i % 4 === 0
  return {
    slug: `demo-realty-${String(i + 1).padStart(2, '0')}`,
    title: `${name} en ${zone} · Demo`,
    description: `PUBLICACIÓN FICTICIA DE DEMOSTRACIÓN.\n\n${name} en la zona de ${zone}, ${city}. Ambientes cómodos, buena iluminación y acceso a servicios. ${bedrooms ? `${bedrooms} habitaciones y ` : ''}${bathrooms} baños, con ${area} m² de superficie.\n\nEstas fotografías son ilustrativas; no corresponden a un inmueble ofrecido realmente. Datos creados únicamente para probar Realty, sus filtros y el mapa.`,
    type, operation, currency, price, bedrooms, bathrooms, areaSquareMeters: area,
    address: `Dirección ficticia de demostración ${i + 1}, zona ${zone}`,
    city, region,
    latitude: lat + ((i % 5) - 2) * 0.0016,
    longitude: lng + ((i % 7) - 3) * 0.0012,
    isExclusive: exact, locationMode: exact ? 'EXACT' : 'RADIUS',
    locationRadiusMeters: [300, 500, 700, 1000][i % 4],
    furnished: i % 3 === 1 ? 'FULLY_FURNISHED' : i % 3 === 2 ? 'PARTIALLY_FURNISHED' : 'UNFURNISHED',
    condition: i % 3 === 0 ? 'NEW' : 'EXCELLENT',
    petsAllowed: i % 2 === 0, expensesIncluded: i % 4 === 0, wifiIncluded: i % 3 === 1,
    parking: i % 3, hasGarage: i % 3 !== 0, hasGarden: type === 'HOUSE',
    hasPool: cityIndex >= 12 && i % 2 === 0,
    features: { hasElevator: type === 'APARTMENT', hasSecurityGate: true },
    appliances: i % 3 === 1 ? ['refrigerador', 'cocina', 'lavadora'] : [],
    images: [0, 1, 2].map(offset => `https://images.unsplash.com/${photos[(i + offset) % photos.length]}?auto=format&fit=crop&w=1000&q=80`),
    advisorId, organizationId, status: 'AVAILABLE',
    publishedAt: new Date(Date.now() - i * 3600000),
    createdAt: new Date(Date.now() - i * 3600000),
  }
}
async function main() {
  for (const name of ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
    const hostname = new URL(process.env[name] || '').hostname
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) throw new Error('Este script solo permite la base de datos y Supabase locales.')
  }
  const prisma = new PrismaClient()
  try {
    await prisma.$connect()
    const saved = fs.existsSync(credentialPath) ? dotenv.parse(fs.readFileSync(credentialPath)) : {}
    const password = saved.REALTY_DEMO_PASSWORD || `Demo!${crypto.randomBytes(15).toString('base64url')}`
    if (!fs.existsSync(credentialPath)) fs.writeFileSync(credentialPath, `# Solo cuentas ficticias del entorno local. No subir este archivo.\nREALTY_DEMO_PASSWORD=${password}\n`, { mode: 0o600 })
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const existing = []
    for (let page = 1; ; page++) {
      const { data, error } = await auth.auth.admin.listUsers({ page, perPage: 100 })
      if (error) throw error
      existing.push(...data.users)
      if (data.users.length < 100) break
    }
    const users = []
    for (const account of accounts) {
      let user = existing.find(user => user.email === account.email)
      if (user && user.app_metadata?.seedTag !== tag) throw new Error(`La cuenta ${account.email} ya existe y no pertenece a estos datos demo.`)
      if (!user) {
        const { data, error } = await auth.auth.admin.createUser({ email: account.email, password, email_confirm: true, app_metadata: { seedTag: tag }, user_metadata: { firstName: account.firstName, lastName: account.lastName, demo: true } })
        if (error) throw error
        user = data.user
      }
      users.push({ ...account, id: user.id })
    }
    await prisma.$transaction(async tx => {
      for (const user of users) {
        const data = { firstName: user.firstName, lastName: user.lastName, email: user.email, bio: `Perfil ficticio para probar Realty. Asesor de demostración en ${user.city}.`, specializations: ['residencial', 'departamentos'], metadata: { seedTag: tag }, status: 'ACTIVE' }
        const existingAdvisor = await tx.advisor.findUnique({ where: { email: user.email } })
        if (existingAdvisor && existingAdvisor.metadata?.seedTag !== tag) throw new Error('Un perfil existente no pertenece al conjunto demo.')
        await tx.advisor.upsert({ where: { id: user.id }, create: { ...data, id: user.id }, update: data })
      }
      const organizations = []
      for (const [index, name, city, region] of [[0, 'Horizonte Inmobiliaria · Demo', 'Cochabamba', 'Cochabamba'], [2, 'Altura Bienes Raíces · Demo', 'La Paz', 'La Paz']]) {
        const slug = `demo-realty-equipo-${index}`
        const organization = await tx.organization.upsert({ where: { slug }, create: { name, slug, city, region, createdById: users[index].id, description: 'Inmobiliaria ficticia de demostración local.' }, update: {} })
        organizations.push(organization)
        for (let j = index; j < index + 2; j++) await tx.advisor.update({ where: { id: users[j].id }, data: { organizationId: organization.id, role: j === index ? 'DIRECTOR' : 'AGENT' } })
      }
      const properties = []
      for (let i = 0; i < 36; i++) {
        const userIndex = i < 20 ? i % 2 : i < 28 ? 2 + i % 2 : 4 + i % 2
        const user = users[userIndex]
        const organizationId = userIndex < 2 ? organizations[0].id : userIndex < 4 ? organizations[1].id : null
        const data = makeProperty(i, user.id, organizationId)
        const prior = await tx.property.findUnique({ where: { slug: data.slug } })
        if (prior && !users.some(user => user.id === prior.advisorId)) throw new Error('Una publicación existente no pertenece al conjunto demo.')
        properties.push(await tx.property.upsert({ where: { slug: data.slug }, create: data, update: data }))
      }
      for (let i = 0; i < users.length; i++) {
        await tx.advisor.update({ where: { id: users[i].id }, data: { totalPropertiesListed: properties.filter(p => p.advisorId === users[i].id).length } })
        for (let j = 0; j < 3; j++) {
          const property = properties[(i * 5 + j + 7) % properties.length]
          await tx.favorite.upsert({ where: { buyerId_propertyId: { buyerId: users[i].id, propertyId: property.id } }, create: { buyerId: users[i].id, propertyId: property.id }, update: {} })
        }
      }
    }, { timeout: 30000 })
    const guide = ['# Accesos demo de Realty (solo entorno local)', '', 'Todas las cuentas usan la contraseña guardada en `.env.demo.local` como `REALTY_DEMO_PASSWORD`.', '', '| Correo | Nombre | Equipo |', '| --- | --- | --- |', ...users.map((u, i) => `| ${u.email} | ${u.firstName} ${u.lastName} | ${i < 2 ? 'Horizonte' : i < 4 ? 'Altura' : 'Independiente'} |`), '', '36 propiedades disponibles con fotos ilustrativas: 20 en Cochabamba, 8 en La Paz y 8 en Santa Cruz.', 'Incluye ventas, alquileres, anticréticos, favoritos y ubicaciones exactas o por radio.', 'Las publicaciones llevan «Demo» en el título. Tu propiedad original no se modifica.', '', 'Para volver a cargar sin duplicados: `npm run db:seed:demo`.', ''].join('\n')
    fs.writeFileSync(path.join(root, 'DEMO.md'), guide)
    console.log(JSON.stringify({ users: users.map(({ email }) => email), demoProperties: await prisma.property.count({ where: { slug: { startsWith: 'demo-realty-' } } }), totalAvailable: await prisma.property.count({ where: { status: 'AVAILABLE' } }), cities: await prisma.property.groupBy({ by: ['city'], where: { slug: { startsWith: 'demo-realty-' } }, _count: true }), credentialsFile: '.env.demo.local', guide: 'DEMO.md' }, null, 2))
    // Verify that all demo accounts can authenticate, without printing session tokens.
    for (const user of users) {
      const { error } = await auth.auth.signInWithPassword({ email: user.email, password })
      if (error) throw new Error(`No se pudo verificar el acceso demo de ${user.email}: ${error.message}`)
    }
    console.log('Verificado: las 6 cuentas demo pueden iniciar sesión.')
  } finally { await prisma.$disconnect() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
