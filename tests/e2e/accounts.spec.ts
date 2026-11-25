import { test, expect, type Page } from '@playwright/test'
import { randomUUID, createHash } from 'node:crypto'
import { prisma } from '../../packages/backend/src/lib/prisma'
const target = new URL(process.env.DATABASE_URL ?? 'http://not-configured.invalid')
if (target.hostname !== '127.0.0.1' || target.port !== '59941' || target.pathname !== '/postgres') {
  throw new Error('Use the isolated account integration environment for browser tests')
}

async function mailCode(email: string) {
  const mails = await fetch('http://127.0.0.1:59942/test-mails').then((res) => res.json()) as { recipient: string; content: string }[]
  const content = mails.filter((mail) => mail.recipient === email).at(-1)?.content
  const html = content?.replace(/=\r?\n/g, '').replace(/=([A-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  const code = html?.match(/>\s*(\d{6})\s*</)?.[1]
  if (!code) throw new Error('No test verification code found')
  return code
}
async function registerAdvisor(page: Page, email: string, password: string) {
  await page.goto('/auth/register')
  await page.getByLabel('Nombres', { exact: true }).fill('María José')
  await page.getByLabel('Apellidos', { exact: true }).fill('Pérez')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Celular con WhatsApp').fill('+591 (7123) 4567')
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verifica tu correo' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Verifica tu correo' })).toBeVisible()
  await page.getByLabel('Código de verificación').fill(await mailCode(email))
  await page.getByRole('button', { name: 'Verificar código', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mi perfil', exact: true })).toBeVisible()
}
test('an unauthenticated visit to the home page reaches login', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Inicia sesión', exact: true })).toBeVisible()
})
test('mobile registration gives accessible field errors and keyboard navigation without overflow', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/auth/register')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Revisa los campos')
  await expect(page.getByLabel('Nombres', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Celular con WhatsApp')).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Nombres', { exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Apellidos', { exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await page.screenshot({ path: info.outputPath('registration-mobile.png'), fullPage: true })
})
test('registration, profile, organization seats and a second browser handover work through the UI', async ({ browser }, info) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const a = await contextA.newPage()
  const b = await contextB.newPage()
  const email = 'ui-' + randomUUID().slice(0, 8) + '@example.com'
  const password = 'Una frase segura para UI 2026'
  try {
    await registerAdvisor(a, email, password)
    await expect(a.getByLabel('Celular con WhatsApp')).toHaveValue('+59171234567')
    await a.getByLabel('Celular con WhatsApp').fill('+591 7234 5678')
    await a.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(a.getByRole('status')).toContainText('Tu perfil se ha actualizado.')
    await a.reload()
    await expect(a.getByLabel('Celular con WhatsApp')).toHaveValue('+59172345678')
    await a.goto('http://127.0.0.1:59943/organization/setup')
    await a.getByPlaceholder('Ej: Realty Experts').fill('Sucursal UI ' + email.slice(3, 11))
    const location = a.getByPlaceholder('Ej: Madrid')
    await location.nth(0).fill('La Paz')
    await location.nth(1).fill('La Paz')
    await a.getByRole('button', { name: 'Crear Inmobiliaria', exact: true }).click()
    await expect(a.getByLabel('Cupos de la sucursal')).toBeVisible()
    await expect(a.getByLabel('Cupos de la sucursal')).toContainText('Miembros')
    await a.screenshot({ path: info.outputPath('organization-seats.png'), fullPage: true })
    const key = createHash('sha256').update('mail:' + email).digest('hex')
    await prisma.authRateLimit.updateMany({ where: { key }, data: { resetAt: new Date(0) } })
    await b.goto('http://127.0.0.1:59943/auth/login')
    await b.getByLabel('Correo electrónico', { exact: true }).fill(email)
    await b.getByLabel('Contraseña', { exact: true }).fill(password)
    await b.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await expect(b.getByRole('heading', { name: 'Autoriza este navegador' })).toBeVisible()
    await b.getByLabel('Código de verificación').fill(await mailCode(email))
    await b.getByRole('button', { name: 'Verificar código', exact: true }).click()
    await expect(b.getByRole('heading', { name: /Hola, María José/ })).toBeVisible()
    await a.reload()
    await expect(a.getByRole('heading', { name: 'Inicia sesión', exact: true })).toBeVisible()
    await expect(a.getByRole('alert')).toContainText('Tu cuenta se abrió en otro navegador')
  } finally { await contextA.close(); await contextB.close() }
})

test('WhatsApp uses the advisor number and the context of each authorized detail', async ({ page }) => {
  const runId = randomUUID().slice(0, 8)
  const email = `whatsapp-${runId}@example.com`
  await registerAdvisor(page, email, 'Una frase segura para WhatsApp 2026')
  const director = await prisma.advisor.findUniqueOrThrow({ where: { email } })
  const organization = await prisma.organization.create({
    data: { name: `Sucursal ${runId}`, slug: `whatsapp-${runId}`, city: 'La Paz', region: 'La Paz', createdById: director.id },
  })
  await prisma.advisor.update({ where: { id: director.id }, data: { organizationId: organization.id, role: 'DIRECTOR', phone: null } })
  await page.reload()
  await expect(page.getByText('Agrega un celular con prefijo internacional', { exact: false })).toBeVisible()
  await page.getByLabel('Celular con WhatsApp').fill('+591 7123 4567')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Tu perfil se ha actualizado.')
  const advisor = await prisma.advisor.create({
    data: { email: `ana-${runId}@example.com`, firstName: 'Ana', lastName: 'García', phone: '+591 7612-3456', organizationId: organization.id },
  })
  const property = await prisma.property.create({
    data: { title: 'Oficina & jardín', slug: `office-${runId}`, type: 'OFFICE', operation: 'RENTAL', price: 3000, address: 'Dirección de prueba', city: 'La Paz', region: 'La Paz', advisorId: advisor.id, organizationId: organization.id },
  })
  const requirement = await prisma.requirement.create({
    data: { title: 'Búsqueda en Sopocachi', propertyType: ['HOUSE'], cities: ['La Paz'], buyerId: advisor.id, visibility: 'ORGANIZATION', organizationId: organization.id },
  })
  const whatsapp = page.getByRole('link', { name: 'Contactar por WhatsApp' })
  async function expectDraft(...fragments: string[]) {
    await expect(whatsapp).toBeVisible()
    const destination = new URL((await whatsapp.getAttribute('href'))!)
    expect(destination.origin).toBe('https://wa.me')
    expect(destination.pathname).toBe('/59176123456')
    for (const fragment of fragments) expect(destination.searchParams.get('text')).toContain(fragment)
  }

  await page.route(`**/api/favorites/${property.id}`, route => route.fulfill({ status: 503 }))
  await page.goto(`/properties/${property.id}`)
  await expect(page.getByRole('button', { name: 'Reintentar cargar favorito' })).toBeVisible()
  await expectDraft('Ana', 'Oficina & jardín', 'La Paz', 'Alquiler', `/properties/${property.id}`)
  await page.context().route('https://wa.me/**', route => route.fulfill({ body: 'WhatsApp test destination' }))
  const [draft] = await Promise.all([page.waitForEvent('popup'), whatsapp.click()])
  await expect(draft).toHaveURL(/^https:\/\/wa\.me\/59176123456\?text=/)
  await draft.close()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/organization/advisors/${advisor.id}`)
  await expectDraft('Ana', 'María José Pérez')
  await page.goto(`/requirements/${requirement.id}`)
  await expectDraft('Ana', 'Búsqueda en Sopocachi', `/requirements/${requirement.id}`)

  await prisma.advisor.update({ where: { id: advisor.id }, data: { status: 'BLOCKED' } })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Búsqueda en Sopocachi' })).toBeVisible()
  await expect(whatsapp).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Contactar al asesor' })).toBeVisible()

  await prisma.advisor.update({ where: { id: director.id }, data: { organizationId: null, role: 'AGENT' } })
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Requerimiento no encontrado')
  await expect(whatsapp).toHaveCount(0)
})
