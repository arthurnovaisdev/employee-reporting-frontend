import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import axios from 'axios'
import { createServer } from 'vite'

const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null } })
after(() => server.close())
const { reportSchema, toReportRequest } = await server.ssrLoadModule('/src/features/reports/report.schema.ts')
const { validateAttachments, maxAttachmentBytes } = await server.ssrLoadModule('/src/features/reports/attachments.ts')
const { submitReport } = await server.ssrLoadModule('/src/features/reports/reports.api.ts')
const { getCategories, readCategoryPage } = await server.ssrLoadModule('/src/features/reports/categories.api.ts')
const {
  consultReport,
  formatReportCreatedAt,
  getProtocolConsultErrorMessage,
  protocolConsultSchema,
  reportStatusLabels,
} = await server.ssrLoadModule('/src/features/reports/protocolConsult.ts')
const { apiClient } = await server.ssrLoadModule('/src/lib/http/apiClient.ts')
const { setAuthSession } = await server.ssrLoadModule('/src/features/auth/authStore.ts')
globalThis.window = new EventTarget()

const setAccessToken = (token) => {
  setAuthSession({ token, name: 'Teste', role: 'EMPLOYEE', passwordChanged: true })
}

const categoryId = '550e8400-e29b-41d4-a716-446655440000'
const values = { categoryId, description: 'Relato de teste.', incidentDate: '', incidentLocation: '' }
const protocol = { protocol: 'DEN-2026-1234567', trackingCode: 'ABC234' }
const pdf = new File(['example'], 'evidencia.pdf', { type: 'application/pdf' })
const png = new File(['example'], 'imagem.png', { type: 'image/png' })
const response = (config, data, status = 201) => ({ config, data, status, statusText: '', headers: {} })
const httpError = (config, status) => new axios.AxiosError('Falha simulada', 'ERR_BAD_RESPONSE', config, undefined, response(config, {}, status))

test('formulário respeita obrigatoriedade, limite e campos opcionais do DTO', () => {
  assert.equal(reportSchema.safeParse(values).success, true)
  assert.equal(reportSchema.safeParse({ ...values, description: '  ' }).success, false)
  assert.equal(reportSchema.safeParse({ ...values, description: 'a'.repeat(5001) }).success, false)
  assert.equal(reportSchema.safeParse({ ...values, categoryId: 'categoria-inventada' }).success, false)
  assert.equal(reportSchema.safeParse({ ...values, incidentDate: '2026-02-30' }).success, false)
  assert.equal(reportSchema.safeParse({ ...values, incidentDate: '2099-01-01', incidentLocation: 'x'.repeat(6000) }).success, true)
  assert.deepEqual(toReportRequest({ ...values, extra: 'não enviar' }), {
    categoryId, description: values.description, incidentDate: null, incidentLocation: null,
  })
})

test('arquivos opcionais, MIME exato, vazios, tamanho individual, total e envelope', async () => {
  assert.equal(await validateAttachments([]), null)
  assert.equal(await validateAttachments([pdf, png, new File(['x'], 'foto.jpg', { type: 'image/jpeg' })]), null)
  assert.match(await validateAttachments([new File(['x'], 'falso.pdf', { type: 'text/plain' })]), /tipo não permitido/)
  assert.match(await validateAttachments([new File(['x'], 'sem-tipo.pdf')]), /tipo não permitido/)
  assert.match(await validateAttachments([new File([], 'vazio.pdf', { type: 'application/pdf' })]), /vazio/)
  assert.match(await validateAttachments([new File([new Uint8Array(maxAttachmentBytes + 1)], 'grande.pdf', { type: 'application/pdf' })]), /por arquivo/)
  const large = new File([new Uint8Array(6 * 1024 * 1024)], 'arquivo.pdf', { type: 'application/pdf' })
  assert.match(await validateAttachments([large, large]), /juntos ultrapassam/)
  const exact = new File([new Uint8Array(maxAttachmentBytes)], 'limite.pdf', { type: 'application/pdf' })
  assert.match(await validateAttachments([exact]), /envio completo ultrapassa/)
})

test('sem anexos executa somente POST /reports e preserva comprovante', async () => {
  const calls = []
  setAccessToken('token-ficticio-para-teste')
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url)
    assert.equal(config.headers.get('Authorization'), 'Bearer token-ficticio-para-teste')
    assert.deepEqual(JSON.parse(config.data), toReportRequest(values))
    return response(config, protocol)
  }
  let created
  const result = await submitReport(toReportRequest(values), [], (receipt) => { created = receipt })
  assert.deepEqual(calls, ['/reports'])
  assert.equal(result.attachmentStatus, 'none')
  assert.equal(created.trackingCode, protocol.trackingCode)
})

test('upload aguarda criação e envia trackingCode e partes files repetidas em FormData', async () => {
  const calls = []
  let created = false
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url)
    if (config.url === '/reports') return response(config, protocol)
    assert.equal(created, true)
    assert.ok(config.data instanceof FormData)
    assert.equal(config.data.get('trackingCode'), protocol.trackingCode)
    assert.deepEqual(config.data.getAll('files').map((file) => file.name), [pdf.name, png.name])
    assert.equal(config.url.includes(protocol.trackingCode), false)
    return response(config, '')
  }
  const result = await submitReport(toReportRequest(values), [pdf, png], () => { created = true })
  assert.deepEqual(calls, ['/reports', `/reports/${protocol.protocol}/attachments`])
  assert.equal(result.attachmentStatus, 'uploaded')
})

test('falha na criação não tenta upload', async () => {
  let calls = 0
  apiClient.defaults.adapter = async (config) => { calls += 1; throw httpError(config, 400) }
  await assert.rejects(submitReport(toReportRequest(values), [pdf], () => assert.fail('não foi criado')))
  assert.equal(calls, 1)
})

for (const status of [400, 401, 403, 413, 500]) {
  test(`falha ${status} no upload mantém protocolo/código, sem retry ou redirecionamento global`, async () => {
    let calls = 0
    let authEvents = 0
    const onAuth = () => { authEvents += 1 }
    window.addEventListener('auth:unauthorized', onAuth)
    window.addEventListener('auth:forbidden', onAuth)
    apiClient.defaults.adapter = async (config) => {
      calls += 1
      if (config.url === '/reports') return response(config, protocol)
      throw httpError(config, status)
    }
    const result = await submitReport(toReportRequest(values), [pdf], () => {})
    assert.equal(result.attachmentStatus, 'failed')
    assert.equal(result.protocol, protocol.protocol)
    assert.equal(result.trackingCode, protocol.trackingCode)
    assert.equal(result.sessionExpired, status === 401)
    assert.equal(calls, 2)
    assert.equal(authEvents, 0)
    window.removeEventListener('auth:unauthorized', onAuth)
    window.removeEventListener('auth:forbidden', onAuth)
  })
}

test('carrega todas as páginas de categorias com UUIDs reais; não depende de lista fixa', async () => {
  const calls = []
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.params.page)
    assert.equal(config.url, '/categories')
    const number = config.params.page
    return response(config, {
      content: [{ id: number === 0 ? categoryId : '550e8400-e29b-41d4-a716-446655440001', name: `Categoria ${number}`, active: number === 0 }],
      number, totalPages: 2,
    }, 200)
  }
  const categories = await getCategories()
  assert.equal(categories.length, 2)
  assert.deepEqual(calls, [0, 1])
  assert.equal(categories[0].id, categoryId)
})

test('paginação é validada em runtime e aceita lista vazia sem inventar categorias', () => {
  assert.deepEqual(readCategoryPage({ content: [], page: { number: 0, totalPages: 0 } }).categories, [])
  assert.throws(() => readCategoryPage({ unexpected: [] }))
  assert.throws(() => readCategoryPage({ content: [{ id: 'inválido' }], number: 0, totalPages: 1 }))
})

test('consulta valida e normaliza somente protocolo e código documentados', () => {
  assert.deepEqual(
    protocolConsultSchema.parse({ protocol: ' den-2026-1234567 ', code: ' abc234 ' }),
    { protocol: 'DEN-2026-1234567', code: 'ABC234' },
  )
  assert.equal(protocolConsultSchema.safeParse({ protocol: '1234567', code: 'ABC234' }).success, false)
  assert.equal(protocolConsultSchema.safeParse({ protocol: 'DEN-2026-1234567', code: 'ABC210' }).success, false)
})

test('consulta usa GET /reports/consult com query params protocol e code e valida o DTO', async () => {
  const report = {
    protocol: 'DEN-2026-1234567',
    category: 'Conduta interna',
    description: 'Relato de teste.',
    status: 'IN_ANALYSIS',
    createdAt: '2026-09-04T12:30:00',
  }
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get')
    assert.equal(config.url, '/reports/consult')
    assert.deepEqual(config.params, { protocol: report.protocol, code: 'ABC234' })
    return response(config, { ...report, administrativeNote: 'não deve ser consumida' }, 200)
  }

  assert.deepEqual(await consultReport({ protocol: report.protocol, code: 'ABC234' }), report)
  assert.equal(reportStatusLabels.IN_ANALYSIS, 'Em análise')
  assert.equal(formatReportCreatedAt(report.createdAt), '04/09/2026 às 12:30')
})

test('consulta não diferencia protocolo inexistente de código incorreto e trata falhas de serviço', () => {
  const config = { url: '/reports/consult', method: 'get' }
  const notFound = new axios.AxiosError(
    'Falha simulada',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response(config, { erro: 'Protocolo não encontrado.' }, 404),
  )
  const invalidCode = new axios.AxiosError(
    'Falha simulada',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response(config, { erro: 'Protocolo ou código de acesso inválido.' }, 404),
  )
  const unavailable = httpError(config, 500)
  const network = new axios.AxiosError('Network Error', 'ERR_NETWORK', config)

  assert.equal(getProtocolConsultErrorMessage(notFound), getProtocolConsultErrorMessage(invalidCode))
  assert.match(getProtocolConsultErrorMessage(unavailable), /temporariamente indisponível/)
  assert.match(getProtocolConsultErrorMessage(network), /conectar ao serviço/)
})
