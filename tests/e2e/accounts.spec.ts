import { test, expect } from '@playwright/test'
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
    await a.goto('http://127.0.0.1:59943/auth/register')
    await a.getByLabel('Nombres', { exact: true }).fill('María José')
    await a.getByLabel('Apellidos', { exact: true }).fill('Pérez')
    await a.getByLabel('Correo electrónico', { exact: true }).fill(email)
    await a.getByLabel('Contraseña', { exact: true }).fill(password)
    await a.getByLabel('Confirmar contraseña', { exact: true }).fill(password)
    await a.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
    await expect(a.getByRole('heading', { name: 'Verifica tu correo' })).toBeVisible()
    await a.reload()
    await expect(a.getByRole('heading', { name: 'Verifica tu correo' })).toBeVisible()
    await a.getByLabel('Código de verificación').fill(await mailCode(email))
    await a.getByRole('button', { name: 'Verificar código', exact: true }).click()
    await expect(a.getByRole('heading', { name: 'Mi perfil', exact: true })).toBeVisible()
    await a.getByLabel('Prefijo internacional').fill('+591')
    await a.getByLabel('Teléfono (opcional)').fill('71234567')
    await a.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(a.getByRole('status')).toContainText('Tu perfil se ha actualizado.')
    await a.reload()
    await expect(a.getByLabel('Teléfono (opcional)')).toHaveValue('71234567')
    await a.goto('http://127.0.0.1:59943/organization/setup')
    await a.getByPlaceholder('Ej: Realty Experts').fill('Sucursal UI ' + email.slice(3, 11))
    const location = a.getByPlaceholder('Ej: Madrid')
    await location.nth(0).fill('La Paz')
    await location.nth(1).fill('La Paz')
    await a.getByRole('button', { name: 'Crear Inmobiliaria', exact: true }).click()
    await expect(a.getByLabel('Cupos de la sucursal')).toBeVisible()
    await expect(a.getByLabel('Cupos de la sucursal')).toContainText('Cuentas')
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
