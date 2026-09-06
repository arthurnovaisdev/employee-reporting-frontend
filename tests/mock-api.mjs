// API local de demonstração para verificação visual. Não grava nenhum dado.
import { createServer } from 'node:http'

const categoryId = '550e8400-e29b-41d4-a716-446655440000'
createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5174')
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (request.method === 'OPTIONS') { response.writeHead(204).end(); return }
  const url = new URL(request.url, 'http://localhost:18080')
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  response.setHeader('Content-Type', 'application/json')
  if (url.pathname === '/api/auth/login') {
    const body = JSON.parse(Buffer.concat(chunks).toString())
    response.end(JSON.stringify({ token: 'fixture-only', name: 'Pessoa de teste', role: body.password === 'Admin1234' ? 'ADMIN' : 'EMPLOYEE', passwordChanged: true }))
  } else if (url.pathname === '/api/categories') {
    response.end(JSON.stringify({ content: [{ id: categoryId, name: 'Conduta interna', active: true }], number: 0, totalPages: 1 }))
  } else if (url.pathname === '/api/reports') {
    response.writeHead(201).end(JSON.stringify({ protocol: 'DEN-2026-1234567', trackingCode: 'ABC234' }))
  } else if (/\/attachments$/.test(url.pathname)) {
    response.writeHead(500).end(JSON.stringify({ erro: 'Falha simulada no upload.' }))
  } else {
    response.writeHead(404).end('{}')
  }
}).listen(18080, '127.0.0.1', () => process.stdout.write('API simulada em http://localhost:18080\n'))
