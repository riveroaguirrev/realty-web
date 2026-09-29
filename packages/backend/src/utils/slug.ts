import { randomBytes } from 'crypto'

const SUFFIX_BYTES = 3
const MAX_BASE_LENGTH = 60

export const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE_LENGTH)

export const generateUniqueSlug = (title: string): string => {
  const base = slugify(title) || 'property'
  return `${base}-${randomBytes(SUFFIX_BYTES).toString('hex')}`
}
