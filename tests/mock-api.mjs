// API local de demonstração para verificação visual. Não grava nenhum dado.
import { createServer } from 'node:http'

const categoryId = '550e8400-e29b-41d4-a716-446655440000'
createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5174')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  if (request.method === 'OPTIONS') { response.writeHead(204).end(); return }
  const url = new URL(request.url, 'http://localhost:18080')
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  response.setHeader('Content-Type', 'application/json')
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = JSON.parse(Buffer.concat(chunks).toString())
    if (!/^\d{11}$/.test(body.cpf ?? '') || typeof body.password !== 'string' || body.password.trim().length === 0 || body.password.length > 100) {
      response.writeHead(400).end(JSON.stringify({ erro: 'Credenciais inválidas.' }))
    } else {
      response.end(JSON.stringify({ token: 'fixture-only', name: 'Pessoa de teste', role: body.password === 'Admin1234' ? 'ADMIN' : 'EMPLOYEE', passwordChanged: true }))
    }
  } else if (request.method === 'POST' && url.pathname === '/api/auth/forgot-password') {
    response.end('{}')
  } else if (request.method === 'POST' && url.pathname === '/api/auth/reset-password') {
    const body = JSON.parse(Buffer.concat(chunks).toString())
    if (!/^[A-Za-z0-9_-]{43}$/.test(body.token ?? '')) {
      response.writeHead(400).end(JSON.stringify({ erro: 'Token inválido ou expirado.' }))
    } else if (typeof body.newPassword !== 'string' || body.newPassword.length < 6 || body.newPassword.length > 100) {
      response.writeHead(400).end(JSON.stringify({ detalhes: { newPassword: 'A nova senha deve ter entre 6 e 100 caracteres.' } }))
    } else {
      response.writeHead(204).end()
    }
  } else if (request.method === 'PATCH' && url.pathname === '/api/users/me/password') {
    const body = JSON.parse(Buffer.concat(chunks).toString())
    if (request.headers.authorization !== 'Bearer fixture-only') {
      response.writeHead(401).end(JSON.stringify({ erro: 'Não autenticado.' }))
    } else if (
      typeof body.currentPassword !== 'string'
      || body.currentPassword.trim().length === 0
      || body.currentPassword.length > 100
      || typeof body.newPassword !== 'string'
      || body.newPassword.length < 6
      || body.newPassword.length > 100
    ) {
      response.writeHead(400).end(JSON.stringify({ erro: 'Confira os dados informados.' }))
    } else {
      response.writeHead(204).end()
    }
  } else if (url.pathname === '/api/categories') {
    response.end(JSON.stringify({ content: [{ id: categoryId, name: 'Conduta interna', active: true }], number: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true, empty: false, numberOfElements: 1 }))
  } else if (url.pathname === '/api/reports') {
    response.writeHead(201).end(JSON.stringify({ protocol: 'DEN-2026-ABCD2345', trackingCode: 'ABCD2345EF' }))
  } else if (/\/attachments$/.test(url.pathname)) {
    response.writeHead(500).end(JSON.stringify({ erro: 'Falha simulada no upload.' }))
  } else {
    response.writeHead(404).end('{}')
  }
}).listen(18080, '127.0.0.1', () => process.stdout.write('API simulada em http://localhost:18080\n'))
