/** @type {import('next').NextConfig} */
const path = require('node:path')

const monorepoRoot = path.join(__dirname, '../..')

module.exports = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
}
