const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { spawnSync } = require('node:child_process')

const cache = new Map()
function loadTS(filename) {
  filename = path.resolve(filename)
  if (cache.has(filename)) return cache.get(filename).exports
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  cache.set(filename, module)
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id.endsWith('.css')) return {}
    const base = id.startsWith('@/') ? path.resolve(__dirname, '../src', id.slice(2))
      : id.startsWith('@shared/') ? path.resolve(__dirname, '../../shared/src', id.slice(8))
      : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null
    if (!base) return require(id)
    const resolved = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
    if (!resolved) throw new Error(`Cannot resolve ${id} from ${filename}`)
    return loadTS(resolved)
  }, module, module.exports)
  return module.exports
}
const { buildPropertyShareMessage, propertyCommissionMessage, propertyWhatsAppShareUrl } = loadTS(path.resolve(__dirname, '../src/utils/propertyShare.ts'))
const { PropertyShare } = loadTS(path.resolve(__dirname, '../src/components/property/PropertyShare.tsx'))
const { canSharePropertyPhotos, isDesktopMac, preparePropertyPhotos, sharePreparedPropertyPhotos } = loadTS(path.resolve(__dirname, '../src/services/propertyShare.ts'))
const { createPhotoArchive } = loadTS(path.resolve(__dirname, '../src/utils/photoArchive.ts'))
const owner = { id: 'owner', role: 'ADVISOR', firstName: 'Valeria', lastName: 'Rivero', phone: '+59170000000' }
const listing = {
  id: 'property', advisorId: owner.id, title: 'Garzonier amoblado', type: 'APARTMENT', operation: 'RENTAL', status: 'AVAILABLE',
  price: '3100.50', currency: 'BOB', city: 'Cochabamba', region: 'Cala Cala', address: 'Dirección privada 123', locationMode: 'RADIUS',
  bedrooms: 1, bathrooms: 1, furnished: 'FULLY_FURNISHED', description: 'Cocina equipada y baño con espejo LED.',
  expensesIncluded: true, wifiIncluded: false, petsAllowed: false, hasPool: true, amenities: { terrace: true, balcony: false },
  appliances: ['stove', 'washer'], commissionPercentage: 30, images: [],
}

test('share control is rendered only for properties created by the current advisor', () => {
  const render = user => renderToStaticMarkup(React.createElement(PropertyShare, { property: listing, user }))
  assert.match(render(owner), /Compartir propiedad/)
  assert.match(render({ ...owner, roleInOrganization: 'DIRECTOR' }), /Compartir propiedad/)
  assert.equal(render(null), '')
  assert.equal(render({ ...owner, id: 'other' }), '')
  assert.equal(render({ ...owner, id: 'director', roleInOrganization: 'DIRECTOR', permissions: ['org:admin'] }), '')
  assert.equal(render({ ...owner, role: 'BUYER' }), '')
})
test('builds a WhatsApp listing from recorded data without inventing furniture, prices or commission splits', () => {
  const message = buildPropertyShareMessage(listing, owner)
  for (const value of ['GARZONIER AMOBLADO', 'En alquiler', '1 dormitorio', '1 baño', 'espejo LED', 'Piscina', 'Terraza', 'Lavadora', 'Incluye expensas', 'Wifi aparte', 'No se permiten mascotas', owner.phone]) assert.ok(message.includes(value), value)
  assert.match(message, /3[.,]100[.,]50/)
  assert.doesNotMatch(message, /Balcón|hidromasaje|cafetera|3300|30.?70|Comisión|ÁREAS COMUNES/)
  assert.equal(propertyCommissionMessage(listing), '🤝 Comisión lado colocador: 30%')
  assert.equal(propertyCommissionMessage({ ...listing, operation: 'SALE', commissionPercentage: 3 }), '🤝 Comisión: 3%')
})
test('advertisement lists existing features and omits absent or unselected amenities', () => {
  const absent = buildPropertyShareMessage({ ...listing, hasPool: false, hasGarden: false, hasGarage: false, parking: 0, furnished: 'UNFURNISHED', rentalFurnished: false, features: { hasElevator: false, hasGym: false }, amenities: { balcony: false, terrace: false }, appliances: [] })
  assert.doesNotMatch(absent, /Piscina|Jardín|Garaje|parqueo|Ascensor|Gimnasio|Balcón|Terraza|Lavadora|Sin amoblar|EQUIPAMIENTO/)
  const present = buildPropertyShareMessage({ ...listing, hasPool: true, hasGarden: true, hasGarage: true, features: { hasElevator: true, hasGym: false }, amenities: { balcony: true, terrace: false } })
  for (const value of ['🏊 Piscina', '🌳 Jardín', '🚗 Garaje', '🛗 Ascensor', '🌤️ Balcón', '🧺 Lavadora', '🛋️ Amoblado']) assert.ok(present.includes(value), value)
  assert.doesNotMatch(present, /Gimnasio|Terraza|Sin piscina|Sin jardín|Sin garaje/)
})
test('sale, rental and anticretic rules show both included and excluded choices without inventing unknown rules', () => {
  for (const operation of ['SALE', 'RENTAL', 'ANTICRETIC']) {
    for (const allowed of [true, false]) {
      const message = buildPropertyShareMessage({ ...listing, operation, petsAllowed: allowed, expensesIncluded: allowed, wifiIncluded: allowed })
      assert.ok(message.includes('📋 *CONDICIONES*'))
      assert.ok(message.includes(allowed ? '🐾 Se permiten mascotas' : '❎ No se permiten mascotas'))
      assert.ok(message.includes(allowed ? '🎁 Incluye expensas' : '🧾 Expensas aparte'))
      assert.ok(message.includes(allowed ? '📶 Wifi incluido' : '📶 Wifi aparte'))
      assert.ok(!message.includes(allowed ? 'No se permiten mascotas' : '🐾 Se permiten mascotas'))
    }
  }
  const restricted = buildPropertyShareMessage({ ...listing, petPolicy: 'RESTRICTIONS', petsAllowed: false, expensesIncluded: false, hoaFees: 250 })
  assert.match(restricted, /Mascotas con restricciones/)
  assert.doesNotMatch(restricted, /No se permiten mascotas|mascota pequeña/)
  assert.match(restricted, /Expensas aparte:.*250/)
  const unknown = buildPropertyShareMessage({ id: 'minimal', advisorId: owner.id, title: 'Casa', operation: 'RENTAL' })
  assert.doesNotMatch(unknown, /mascotas|expensas|Wifi|CONDICIONES/i)
  const sale = buildPropertyShareMessage({ ...listing, operation: 'SALE', petsAllowed: true, expensesIncluded: false, wifiIncluded: false })
  assert.match(sale, /Se permiten mascotas/)
  assert.match(sale, /Expensas aparte/)
  assert.match(sale, /Wifi aparte/)
})
test('places price and area before features and uses only recorded location and equipment details', () => {
  const message = buildPropertyShareMessage({ ...listing, areaSquareMeters: 110, school: 'UNIVALLE', distanceToSchool: 0.5, distanceToTransit: 0.2, utilities: { electricity: true, gas: true, water: false, internet: false } }, owner)
  assert.ok(message.indexOf('ALQUILER:') < message.indexOf('CARACTERÍSTICAS'))
  assert.ok(message.indexOf('110 m²') < message.indexOf('CARACTERÍSTICAS'))
  for (const value of ['UBICACIÓN Y ENTORNO', 'UNIVALLE', '💡 Electricidad', '🔥 Gas', '¡AGENDA TU VISITA HOY!', 'WhatsApp: 📞']) assert.ok(message.includes(value), value)
  assert.doesNotMatch(message, /UNIFRANZ|UPAL|24 horas|17 líneas|medidores independientes|💧 Agua|📶 Internet/)
  const withoutReferences = buildPropertyShareMessage(listing)
  assert.doesNotMatch(withoutReferences, /UBICACIÓN Y ENTORNO|universidades|Transporte público|¡AGENDA TU VISITA HOY!/)
})
test('does not export private address, owner contact, documents, notes or metadata', () => {
  const sensitive = { ...listing, contact: { phone: 'private-owner' }, visitNotes: 'private-notes', documents: { deedUrl: 'private-deed' }, priceHistory: ['private-history'], viewCount: 999 }
  const message = buildPropertyShareMessage(sensitive, owner)
  assert.doesNotMatch(message, /Dirección privada|private-|999/)
  assert.match(buildPropertyShareMessage({ ...listing, isExclusive: true, locationMode: 'EXACT' }, owner), /Dirección privada 123/)
  assert.match(buildPropertyShareMessage({ ...listing, status: 'SOLD' }), /Estado:/)
})
test('absent values do not become NaN, false conditions, phone placeholders or unrecorded amenities', () => {
  const message = buildPropertyShareMessage({ id: 'minimal', advisorId: 'owner', title: 'Terreno', type: 'LAND', operation: 'SALE', city: 'Cochabamba' })
  assert.doesNotMatch(message, /NaN|undefined|null|mascotas|Wifi|Expensas|📲|📞|Piscina/)
  assert.equal(propertyCommissionMessage({ ...listing, commissionPercentage: null }), '')
  const text = 'Título & zona #1\nBs. 3.100 🏡'
  assert.equal(new URL(propertyWhatsAppShareUrl(text)).searchParams.get('text'), text)
})
test('WhatsApp share bypasses the short-link redirect and preserves emojis, accents and edited text', () => {
  const message = `${buildPropertyShareMessage(listing, owner)}\n\n${propertyCommissionMessage(listing)}\n🛋️ 🛏️ 👩🏻‍🍳 🏡 ⭐️\nZona & precio #1: 30% + expensas`
  const url = new URL(propertyWhatsAppShareUrl(message))
  assert.equal(url.origin, 'https://api.whatsapp.com')
  assert.equal(url.pathname, '/send')
  assert.equal(url.searchParams.get('text'), message)
  assert.match(url.search, /%F0%9F/)
  assert.doesNotMatch(url.href, /wa\.me|%EF%BF%BD|%25F0/)
})
test('photos keep their order and MIME types; preparation is anonymous and rejects incomplete batches', async t => {
  const previousFetch = global.fetch
  t.after(() => { global.fetch = previousFetch })
  const requests = []
  global.fetch = async (url, options) => {
    requests.push({ url, options })
    if (url === 'missing') return new Response('', { status: 404 })
    return new Response(url, { headers: { 'content-type': url === 'png' ? 'image/png' : 'image/jpeg' } })
  }
  const files = await preparePropertyPhotos(['jpeg', 'png'], 'Mi departamento', new AbortController().signal)
  assert.deepEqual(files.map(file => file.type), ['image/jpeg', 'image/png'])
  assert.equal(await files[0].text(), 'jpeg')
  assert.equal(await files[1].text(), 'png')
  assert.ok(requests.every(({ options }) => options.credentials === 'omit' && options.signal))
  await assert.rejects(preparePropertyPhotos(['jpeg', 'missing'], 'Casa', new AbortController().signal), /todas las fotos/)
  global.fetch = async () => new Response('not a photo', { headers: { 'content-type': 'text/html' } })
  await assert.rejects(preparePropertyPhotos(['bad'], 'Casa', new AbortController().signal), /formato compatible/)
  global.fetch = async () => new Response('image', { headers: { 'content-type': 'image/png', 'content-length': String(33 * 1024 * 1024) } })
  await assert.rejects(preparePropertyPhotos(['big'], 'Casa', new AbortController().signal), /32 MB/)
})
test('canceling preparation never returns a partially prepared photo selection', async t => {
  const previousFetch = global.fetch
  t.after(() => { global.fetch = previousFetch })
  global.fetch = async (_url, { signal }) => { signal.throwIfAborted(); return new Response('photo', { headers: { 'content-type': 'image/jpeg' } }) }
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(preparePropertyPhotos(['photo'], 'Casa', controller.signal), { name: 'AbortError' })
})
test('native sharing receives exactly the selected photo bytes and the current message in a single payload', async t => {
  const previousFetch = global.fetch
  t.after(() => { global.fetch = previousFetch })
  const originals = { first: Uint8Array.from([255, 216, 1, 2, 3]), third: Uint8Array.from([255, 216, 9, 8, 7]) }
  const requested = []
  global.fetch = async url => { requested.push(url); return new Response(originals[url], { headers: { 'content-type': 'image/jpeg' } }) }
  const files = await preparePropertyPhotos(['first', 'third'], 'Casa', new AbortController().signal)
  const message = '📍 Mensaje editado para compartir con mi grupo\n💰 Bs. 3.100'
  let payload
  const target = { canShare: data => data.files.length === 2, share: async data => { payload = data } }
  assert.equal(canSharePropertyPhotos(files, target), true)
  await sharePreparedPropertyPhotos(files, 'Casa', message, target)
  assert.deepEqual(requested, ['first', 'third'])
  assert.equal(payload.files, files)
  assert.equal(payload.files.length, 2)
  assert.equal(payload.text, message)
  assert.deepEqual(new Uint8Array(await payload.files[0].arrayBuffer()), originals.first)
  assert.deepEqual(new Uint8Array(await payload.files[1].arrayBuffer()), originals.third)
})
test('an unsupported file share never silently sends only the message', async () => {
  let dispatched = false
  const target = { canShare: () => false, share: async () => { dispatched = true } }
  const files = [new File(['photo'], 'foto.jpg', { type: 'image/jpeg' })]
  assert.equal(canSharePropertyPhotos(files, target), false)
  assert.equal(canSharePropertyPhotos([], target), false)
  await assert.rejects(sharePreparedPropertyPhotos(files, 'Casa', 'Mensaje', target), /no permite compartir/)
  assert.equal(dispatched, false)
})
test('Mac uses the download workflow without mistaking an iPad for a desktop Mac', () => {
  assert.equal(isDesktopMac({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', maxTouchPoints: 0 }), true)
  assert.equal(isDesktopMac({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', maxTouchPoints: 5 }), false)
  assert.equal(isDesktopMac({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148', maxTouchPoints: 5 }), false)
  assert.equal(isDesktopMac({ userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/130.0', maxTouchPoints: 5 }), false)
  assert.equal(isDesktopMac({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0', maxTouchPoints: 0 }), false)
})
test('download archive opens as a real ZIP and preserves all photo bytes and Unicode filenames', async () => {
  const archive = await createPhotoArchive([new File(['first photo'], 'fotografía-1.jpg'), new File(['second photo'], 'foto-2.png')])
  const result = spawnSync('python3', ['-c', 'import io,sys,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))'], { input: Buffer.from(await archive.arrayBuffer()), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { 'fotografía-1.jpg': 'first photo', 'foto-2.png': 'second photo' })
})
