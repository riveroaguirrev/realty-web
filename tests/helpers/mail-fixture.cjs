// Isolated development-only SMTP capture and GoTrue proxy. Never sends real mail.
const net = require('node:net')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const messages = []
const smtp = net.createServer((socket) => {
  socket.setEncoding('utf8')
  socket.write('220 account-tests ESMTP\r\n')
  let buffer = '', recipient = '', content = '', reading = false
  socket.on('data', (chunk) => {
    buffer += chunk
    let end
    while ((end = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2)
      if (reading) {
        if (line === '.') { messages.push({ recipient, content }); reading = false; socket.write('250 accepted\r\n') }
        else content += line + '\r\n'
      } else if (/^EHLO|^HELO/i.test(line)) socket.write('250-account-tests\r\n250 PIPELINING\r\n')
      else if (/^MAIL FROM/i.test(line)) { content = ''; socket.write('250 sender ok\r\n') }
      else if (/^RCPT TO/i.test(line)) { recipient = line.match(/<([^>]+)>/)?.[1] ?? ''; socket.write('250 recipient ok\r\n') }
      else if (/^DATA/i.test(line)) { reading = true; socket.write('354 send content\r\n') }
      else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n')
      else socket.write('250 ok\r\n')
    }
  })
})
const server = http.createServer((req, res) => {
  const origin = req.headers.origin
  const cors = origin === 'http://127.0.0.1:59943' || origin === 'http://localhost:59943' ? {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,x-supabase-api-version',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'vary': 'Origin',
  } : {}
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return }
  if (req.url.startsWith('/templates/')) {
    const file = req.url.includes('email-change') ? 'email-change.html' : 'code.html'
    res.setHeader('Content-Type', 'text/html')
    res.end(fs.readFileSync(path.join(__dirname, '../../supabase/templates', file)))
    return
  }
  if (req.url === '/test-mails') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(messages)); return }
  const proxy = http.request({ hostname: '127.0.0.1', port: 59946, path: req.url.replace(/^\/auth\/v1/, ''), method: req.method, headers: req.headers }, (upstream) => {
    res.writeHead(upstream.statusCode, { ...upstream.headers, ...cors }); upstream.pipe(res)
  })
  proxy.on('error', () => { res.statusCode = 503; res.end('Auth unavailable') })
  req.pipe(proxy)
})
smtp.listen(59944, '0.0.0.0')
server.listen(59942, '0.0.0.0', () => console.log('Isolated mail capture and auth proxy ready'))
