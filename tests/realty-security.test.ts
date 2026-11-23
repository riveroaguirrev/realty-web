import './setup'
import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import type { Prisma } from '@prisma/client'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { Permission, UserRole } from '@shared/types'
import { GET as similar } from '../packages/backend/src/app/api/properties/[id]/similar/route'
import { visiblePropertyWhere } from '../packages/backend/src/lib/permissions'
import { propertyImageService } from '../packages/backend/src/services/propertyImage.service'
import { readPagination } from '../packages/backend/src/utils/pagination'
import { propertyCardSelect, propertyDiscoverySelect } from '../packages/backend/src/utils/propertyView'
import { MAX_IMAGE_BYTES, normalizePropertyImage, readPropertyImageForm } from '../packages/backend/src/utils/validatePropertyImage'

const { NextRequest } = createRequire(resolve('packages/backend/package.json'))('next/server')

test('similar listings require a session and the card projection contains only display fields', async () => {
  const response = await similar(new NextRequest('http://localhost/api/properties/reference/similar'), {
    params: Promise.resolve({ id: 'reference' }),
  })
  assert.equal(response.status, 401)
  assert.deepEqual(Object.keys(propertyCardSelect).sort(), [
    'areaSquareMeters', 'bathrooms', 'bedrooms', 'city', 'currency', 'id', 'images',
    'operation', 'price', 'title', 'type',
  ])
  for (const internal of ['documents', 'visitNotes', 'contact', 'priceHistory']) {
    assert.equal(Object.hasOwn(propertyDiscoverySelect, internal), false)
  }
})

test('the archived listing visibility filter admits the managing advisor and director in the same office', () => {
  const publicStatus = { status: { not: 'ARCHIVED' } }
  assert.deepEqual(visiblePropertyWhere({ id: 'buyer', role: UserRole.BUYER }), publicStatus)
  assert.deepEqual(visiblePropertyWhere({ id: 'advisor', role: UserRole.ADVISOR, organizationId: 'office' }),
    { OR: [publicStatus, { advisorId: 'advisor' }] })
  assert.deepEqual(visiblePropertyWhere({
    id: 'director', role: UserRole.ADVISOR, permissions: [Permission.ORG_ADMIN], organizationId: 'office',
  }), { OR: [publicStatus, { advisorId: 'director' }, { organizationId: 'office' }] })
})

test('retaining a legacy photo requires no registration and removal queues only images linked to the listing', async () => {
  const operations: object[] = []
  const tx = { propertyImage: { updateMany: async (args: object) => {
    operations.push(args)
    return { count: 1 }
  } } } as unknown as Prisma.TransactionClient

  await propertyImageService.attach(tx, 'listing', 'advisor', ['legacy', 'retired'], ['new', 'legacy'])
  assert.equal(operations.length, 2)
  assert.deepEqual(operations[0], {
    where: { url: { in: ['new'] }, uploadedBy: 'advisor', propertyId: null, removedAt: null },
    data: { propertyId: 'listing' },
  })
  assert.match(JSON.stringify(operations[1]), /"where":\{"propertyId":"listing","url":\{"in":\["retired"\]/)
})

test('a stalled or unregistered photo attachment fails before updating the listing', async () => {
  const tx = { propertyImage: { updateMany: async () => ({ count: 0 }) } } as unknown as Prisma.TransactionClient
  await assert.rejects(propertyImageService.attach(tx, 'listing', 'advisor', [], ['unregistered']), {
    code: 'INVALID_PROPERTY_IMAGE',
  })
})

test('valid JPEG, PNG and WebP survive image normalization and output has no EXIF', async () => {
  const source = sharp({ create: { width: 10, height: 8, channels: 3, background: 'blue' } })
  for (const format of ['jpeg', 'png', 'webp'] as const) {
    const bytes = await source.clone().withMetadata().toFormat(format).toBuffer()
    const file = new File([new Uint8Array(bytes)], 'image.' + format, { type: 'image/' + format })
    const form = new FormData()
    form.append('file', file)
    const request = new Request('http://localhost/api/properties/images', { method: 'POST', body: form })
    const parsed = await readPropertyImageForm(request)
    const output = await normalizePropertyImage(parsed.get('file') as File)
    const metadata = await sharp(output.bytes).metadata()
    assert.equal(output.type, 'image/' + format)
    assert.equal(metadata.width, 10)
    assert.equal(metadata.height, 8)
    assert.equal(metadata.exif, undefined)
  }
})

test('uploads reject unreadable files and enforce the body limit without relying on Content-Length', async () => {
  await assert.rejects(normalizePropertyImage(new File(['not a photo'], 'photo.png', { type: 'image/png' })), {
    code: 'INVALID_IMAGE',
  })
  const form = new FormData()
  form.append('file', new File([new Uint8Array(MAX_IMAGE_BYTES + 100000)], 'photo.png', { type: 'image/png' }))
  const request = new Request('http://localhost/api/properties/images', { method: 'POST', body: form })
  assert.equal(request.headers.get('content-length'), null)
  await assert.rejects(readPropertyImageForm(request), { statusCode: 413 })
})

test('pagination keeps standard page sizes and bounds abusive or invalid values', () => {
  assert.deepEqual(readPagination(new URLSearchParams('page=2&pageSize=20'), 10), { page: 2, pageSize: 20 })
  assert.deepEqual(readPagination(new URLSearchParams('page=999999&pageSize=999999'), 10), { page: 10000, pageSize: 100 })
  assert.deepEqual(readPagination(new URLSearchParams('page=-1&pageSize=0'), 10), { page: 1, pageSize: 10 })
})
