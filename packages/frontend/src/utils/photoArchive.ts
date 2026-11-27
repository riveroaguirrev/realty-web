// Uncompressed ZIP: photos are already compressed, so no additional dependency is needed.
const encoder = new TextEncoder()
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function header(size: number, signature: number) {
  const bytes = new Uint8Array(size)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, signature, true)
  return { bytes, view }
}

export async function createPhotoArchive(files: File[]): Promise<Blob> {
  const entries: BlobPart[] = []
  const directory: BlobPart[] = []
  let offset = 0
  let directorySize = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = new Uint8Array(await file.arrayBuffer())
    const crc = crc32(data)
    const local = header(30, 0x04034b50)
    local.view.setUint16(4, 20, true)
    local.view.setUint16(6, 0x0800, true)
    local.view.setUint16(12, 0x21, true)
    local.view.setUint32(14, crc, true)
    local.view.setUint32(18, data.length, true)
    local.view.setUint32(22, data.length, true)
    local.view.setUint16(26, name.length, true)
    entries.push(local.bytes, name, data)
    const central = header(46, 0x02014b50)
    central.view.setUint16(4, 20, true)
    central.view.setUint16(6, 20, true)
    central.view.setUint16(8, 0x0800, true)
    central.view.setUint16(14, 0x21, true)
    central.view.setUint32(16, crc, true)
    central.view.setUint32(20, data.length, true)
    central.view.setUint32(24, data.length, true)
    central.view.setUint16(28, name.length, true)
    central.view.setUint32(42, offset, true)
    directory.push(central.bytes, name)
    offset += 30 + name.length + data.length
    directorySize += 46 + name.length
  }
  const end = header(22, 0x06054b50)
  end.view.setUint16(8, files.length, true)
  end.view.setUint16(10, files.length, true)
  end.view.setUint32(12, directorySize, true)
  end.view.setUint32(16, offset, true)
  return new Blob([...entries, ...directory, end.bytes], { type: 'application/zip' })
}
