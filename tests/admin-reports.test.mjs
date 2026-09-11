import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import axios from 'axios'
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null } })
after(() => server.close())
globalThis.window = new EventTarget()
const { getAdminReports, readAdminReportPage, updateReportStatus, getAdminReportError, getAdminReportDetail, getAdminAttachment, getAdminAttachmentError } = await server.ssrLoadModule('/src/features/reports/adminReports.api.ts')
const { downloadAttachment, formatAttachmentSize } = await server.ssrLoadModule('/src/features/reports/adminAttachmentPreview.ts')
const { AdminReportAttachments } = await server.ssrLoadModule('/src/features/reports/AdminReportAttachments.tsx')
const { apiClient } = await server.ssrLoadModule('/src/lib/http/apiClient.ts')
const { setAuthSession, getAccessToken } = await server.ssrLoadModule('/src/features/auth/authStore.ts')
const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthContext.tsx')
const { ProtectedRoute, PasswordChangedRoute, RoleRoute } = await server.ssrLoadModule('/src/features/auth/RouteGuards.tsx')

const report = { protocol: 'DEN-2026-ABCD2345', category: 'Conduta interna', description: 'Relato de teste.', status: 'RECEIVED', createdAt: '2026-09-01T12:30:00' }
const response = (config, data, status = 200) => ({ config, data, status, statusText: '', headers: {} })
const attachment = { id: '550e8400-e29b-41d4-a716-446655440002', originalFileName: 'comprovante.pdf', contentType: 'application/pdf', fileSize: 245760, createdAt: '2026-09-04T12:35:00' }
const detail = { ...report, incidentDate: '2026-09-03', incidentLocation: 'Unidade Salvador', attachments: [attachment] }
const authenticate = (token = 'fixture-admin', role = 'ADMIN', passwordChanged = true) => {
  setAuthSession({ token, name: 'Teste', role, passwordChanged })
}
const setAccessToken = (token) => authenticate(token)
const springPage = (content, number = 0, totalPages = 1, totalElements = content.length) => ({
  content, number, size: 10, totalElements, totalPages, first: number === 0,
  last: totalPages === 0 || number + 1 >= totalPages, empty: content.length === 0,
  numberOfElements: content.length,
})

test('detalhe usa protocolo, Bearer e DTO administrativo, descartando campos privados', async () => {
  setAccessToken('fixture-admin')
  const controller = new AbortController()
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get')
    assert.equal(config.url, `/reports/admin/${report.protocol}`)
    assert.equal(config.params, undefined)
    assert.equal(config.signal, controller.signal)
    assert.equal(config.headers.get('Authorization'), 'Bearer fixture-admin')
    return response(config, { ...detail, storedFileName: 'private', attachments: [{ ...attachment, storedFileName: 'private', path: '/private' }] })
  }
  assert.deepEqual(await getAdminReportDetail(report.protocol, controller.signal), detail)
  apiClient.defaults.adapter = async (config) => response(config, { ...detail, attachments: [] })
  assert.deepEqual((await getAdminReportDetail(report.protocol)).attachments, [])
  apiClient.defaults.adapter = async (config) => response(config, report)
  await assert.rejects(getAdminReportDetail(report.protocol))
  apiClient.defaults.adapter = async (config) => response(config, { ...detail, protocol: 'outro' })
  await assert.rejects(getAdminReportDetail(report.protocol))
})

test('arquivo usa endpoint autenticado com responseType blob para PDF, JPEG e PNG', async () => {
  setAccessToken('fixture-admin')
  for (const type of ['application/pdf', 'image/jpeg', 'image/png']) {
    const blob = new Blob(['fixture'], { type })
    const controller = new AbortController()
    apiClient.defaults.adapter = async (config) => {
      assert.equal(config.method, 'get')
      assert.equal(config.url, `/reports/admin/${report.protocol}/attachments/${attachment.id}`)
      assert.equal(config.headers.get('Authorization'), 'Bearer fixture-admin')
      assert.match(config.headers.get('Accept'), /application\/pdf/)
      assert.equal(config.responseType, 'blob')
      assert.equal(config.signal, controller.signal)
      return {
        ...response(config, blob),
        headers: new axios.AxiosHeaders({
          'content-disposition': "attachment; filename*=UTF-8''comprovante%20seguro.pdf",
        }),
      }
    }
    const downloaded = await getAdminAttachment(report.protocol, attachment.id, controller.signal)
    assert.equal(downloaded.blob, blob)
    assert.equal(downloaded.suggestedFileName, 'comprovante seguro.pdf')
  }
})

test('erros do detalhe e blob preservam sessão em 403 e encerram em 401, sem expor erros internos', async () => {
  for (const load of [() => getAdminReportDetail(report.protocol), () => getAdminAttachment(report.protocol, attachment.id)]) {
    for (const status of [401, 403, 404, 500]) {
      setAccessToken('fixture-admin')
      apiClient.defaults.adapter = async (config) => {
        throw new axios.AxiosError('Simulado', 'ERR_BAD_RESPONSE', config, undefined,
          response(config, new Blob(['{"erro":"detalhe interno sensível"}'], { type: 'application/json' }), status))
      }
      await assert.rejects(load(), (error) => {
        assert.equal(getAdminAttachmentError(error).includes('sensível'), false)
        if (status === 404) assert.match(getAdminAttachmentError(error), /Anexo não encontrado/)
        return true
      })
      assert.equal(getAccessToken(), status === 401 ? null : 'fixture-admin')
    }
  }
  assert.match(getAdminAttachmentError(new axios.AxiosError('Network Error', 'ERR_NETWORK')), /conexão/)
})

test('download usa blob local, nome sugerido e revoga a URL temporária', () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  const revoked = []
  let clicked = 0
  let appended = 0
  let removed = 0
  const link = { href: '', download: '', rel: '', style: {}, click: () => clicked++, remove: () => removed++ }
  globalThis.window = { setTimeout: (callback) => { callback(); return 1 } }
  globalThis.document = { createElement: (tag) => { assert.equal(tag, 'a'); return link }, body: { appendChild: () => appended++ } }
  URL.createObjectURL = () => 'blob:fixture'
  URL.revokeObjectURL = (url) => revoked.push(url)
  try {
    downloadAttachment(new Blob(['fixture'], { type: 'application/pdf' }), 'comprovante seguro.pdf')
    assert.equal(link.href, 'blob:fixture')
    assert.equal(link.download, 'comprovante seguro.pdf')
    assert.equal(link.rel, 'noopener')
    assert.equal(appended, 1)
    assert.equal(clicked, 1)
    assert.equal(removed, 1)
    assert.deepEqual(revoked, ['blob:fixture'])
    assert.throws(() => downloadAttachment(new Blob(['<script>'], { type: 'text/html' }), 'inseguro.html'))
  } finally {
    globalThis.window = originalWindow
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
})

test('seção de anexos exibe metadados amigáveis, vazio sem erro e ações só para ADMIN', () => {
  for (const role of ['ADMIN', 'EMPLOYEE']) {
    authenticate('fixture', role)
    const client = new QueryClient()
    const h = React.createElement
    const render = (attachments) => renderToString(h(QueryClientProvider, { client }, h(AuthProvider, null,
      h(AdminReportAttachments, { protocol: report.protocol, attachments }),
    )))
    const html = render([attachment])
    assert.match(html, /comprovante.pdf/)
    assert.match(html, /240 KB/)
    assert.match(html, /04\/09\/2026 às 12:35/)
    assert.match(html, /Baixar/)
    assert.equal(html.includes(attachment.id), false)
    assert.equal(html.includes('/reports/admin/'), false)
    assert.equal(/<button[^>]*disabled/.test(html), role !== 'ADMIN')
    const empty = render([])
    assert.match(empty, /Nenhum anexo enviado nesta denúncia/)
    assert.equal(empty.includes('role="alert"'), false)
    client.clear()
  }
  assert.equal(formatAttachmentSize(null), 'Tamanho não informado')
  assert.equal(formatAttachmentSize(123), '123 bytes')
  assert.equal(formatAttachmentSize(1572864), '1,5 MB')
})

// Fixtures do adaptador defensivo, não exemplos confirmados do backend real.
test('GET administrativo envia apenas page/size e mantém a ordem do retorno', async () => {
  const reports = [{ ...report, protocol: 'DEN-2026-WXYZ6789', createdAt: '2026-09-02T12:30:00' }, report]
  setAccessToken('fixture-admin')
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get')
    assert.equal(config.url, '/reports/admin')
    assert.deepEqual(config.params, { page: 0, size: 10 })
    assert.equal(config.headers.get('Authorization'), 'Bearer fixture-admin')
    return response(config, springPage(reports, 0, 2, 12))
  }
  const result = await getAdminReports(0)
  assert.deepEqual(result.reports, reports)
  assert.equal(result.hasNext, true)
  assert.equal(result.totalElements, 12)
})

test('paginação usa o Page Spring padrão e rejeita metadados ausentes ou inconsistentes', () => {
  const finalPage = readAdminReportPage(springPage([report], 1, 2, 11))
  assert.equal(finalPage.hasNext, false)
  assert.equal(readAdminReportPage(springPage([], 0, 0, 0)).hasNext, false)
  assert.throws(() => readAdminReportPage({ items: [report], number: 0 }))
  assert.throws(() => readAdminReportPage({ ...springPage([report]), totalPages: '2' }))
  assert.throws(() => readAdminReportPage({ ...springPage([report]), numberOfElements: 0 }))
})

test('PATCH usa enum exato e note, ignora campos extras e consome só o DTO real', async () => {
  let calls = 0
  apiClient.defaults.adapter = async (config) => {
    calls++
    assert.equal(config.method, 'patch')
    assert.equal(config.url, `/reports/admin/${report.protocol}/status`)
    assert.equal(config.params, undefined)
    assert.deepEqual(JSON.parse(config.data), { newStatus: 'UNDER_INVESTIGATION', note: 'Observação de teste.' })
    return response(config, { ...report, status: 'UNDER_INVESTIGATION', incidentLocation: 'não consumir', note: 'não consumir' })
  }
  const updated = await updateReportStatus(report.protocol, { newStatus: 'UNDER_INVESTIGATION', note: 'Observação de teste.', extra: true })
  assert.deepEqual(updated, { ...report, status: 'UNDER_INVESTIGATION' })
  assert.equal(calls, 1)
  await assert.rejects(updateReportStatus(report.protocol, { newStatus: 'Em análise', note: '' }))
  await assert.rejects(updateReportStatus(report.protocol, { newStatus: 'CLOSED', note: 'a'.repeat(2001) }))
  assert.equal(calls, 1)
})

test('401 encerra token, 403 sinaliza acesso negado e falhas não repetem PATCH', async () => {
  let unauthorized = 0
  let forbidden = 0
  window.addEventListener('auth:unauthorized', () => unauthorized++)
  window.addEventListener('auth:forbidden', () => forbidden++)
  for (const status of [400, 401, 403, 404, 500]) {
    let calls = 0
    setAccessToken('fixture-admin')
    apiClient.defaults.adapter = async (config) => {
      calls++
      throw new axios.AxiosError('Simulado', 'ERR_BAD_RESPONSE', config, undefined, response(config, { erro: 'detalhe interno sensível' }, status))
    }
    await assert.rejects(updateReportStatus(report.protocol, { newStatus: 'CLOSED', note: '' }), (error) => {
      assert.equal(getAdminReportError(error).includes('sensível'), false)
      return true
    })
    assert.equal(calls, 1)
    if (status === 401) assert.equal(getAccessToken(), null)
  }
  assert.equal(unauthorized, 1)
  assert.equal(forbidden, 1)
  assert.match(getAdminReportError(new axios.AxiosError('Network Error', 'ERR_NETWORK')), /conectar/)
})

test('guards administrativos só renderizam conteúdo para ADMIN após troca de senha', () => {
  for (const [role, passwordChanged, allowed] of [
    ['EMPLOYEE', true, false], ['EMPLOYEE', false, false], ['ADMIN', false, false], ['ADMIN', true, true],
  ]) {
    authenticate('fixture', role, passwordChanged)
    const client = new QueryClient()
    const h = React.createElement
    const html = renderToString(h(QueryClientProvider, { client }, h(AuthProvider, null,
      h(MemoryRouter, { initialEntries: ['/admin/reports'] }, h(Routes, null,
        h(Route, { element: h(ProtectedRoute) },
          h(Route, { element: h(PasswordChangedRoute) },
            h(Route, { element: h(RoleRoute, { allowedRoles: ['ADMIN'] }) },
              h(Route, { path: '/admin/reports', element: h('div', null, 'ADMIN_ONLY_CONTENT') }),
            ),
          ),
        ),
      )),
    )))
    assert.equal(html.includes('ADMIN_ONLY_CONTENT'), allowed)
    client.clear()
  }
})
