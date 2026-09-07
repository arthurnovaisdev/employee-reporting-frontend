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
const { getAdminReports, readAdminReportPage, updateReportStatus, getAdminReportError } = await server.ssrLoadModule('/src/features/reports/adminReports.api.ts')
const { apiClient } = await server.ssrLoadModule('/src/lib/http/apiClient.ts')
const { setAccessToken, getAccessToken } = await server.ssrLoadModule('/src/features/auth/tokenStore.ts')
const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthContext.tsx')
const { ProtectedRoute, PasswordChangedRoute, RoleRoute } = await server.ssrLoadModule('/src/features/auth/RouteGuards.tsx')

const report = { protocol: 'DEN-2026-1234567', category: 'Conduta interna', description: 'Relato de teste.', status: 'RECEIVED', createdAt: '2026-09-01T12:30:00' }
const response = (config, data, status = 200) => ({ config, data, status, statusText: '', headers: {} })
// Fixtures do adaptador defensivo, não exemplos confirmados do backend real.
test('GET administrativo envia apenas page/size e mantém a ordem do retorno', async () => {
  const reports = [{ ...report, protocol: 'DEN-2026-7654321', createdAt: '2026-09-02T12:30:00' }, report]
  setAccessToken('fixture-admin')
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get')
    assert.equal(config.url, '/reports/admin')
    assert.deepEqual(config.params, { page: 0, size: 10 })
    assert.equal(config.headers.get('Authorization'), 'Bearer fixture-admin')
    return response(config, { content: reports, number: 0, totalPages: 2, totalElements: 12, last: false })
  }
  const result = await getAdminReports(0)
  assert.deepEqual(result.reports, reports)
  assert.equal(result.hasNext, true)
  assert.equal(result.totalElements, 12)
})

test('paginação usa somente metadados válidos e não inventa totais ausentes', () => {
  const finalPage = readAdminReportPage({ content: [report], page: { number: 1, totalPages: 2, totalElements: 11 } })
  assert.equal(finalPage.hasNext, false)
  const partial = readAdminReportPage({ content: [report], number: 0 })
  assert.equal(partial.totalPages, undefined)
  assert.equal(partial.totalElements, undefined)
  assert.equal(partial.hasNext, undefined)
  assert.equal(readAdminReportPage({ content: [], number: 0, totalPages: 0, totalElements: 0 }).hasNext, false)
  assert.throws(() => readAdminReportPage({ items: [report], number: 0 }))
  assert.throws(() => readAdminReportPage({ content: [report], number: 0, totalPages: '2' }))
  assert.throws(() => readAdminReportPage({ content: [report], number: 0, totalPages: 0 }))
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
    window.sessionStorage = { getItem: () => JSON.stringify({ role, passwordChanged, token: 'fixture', name: 'Teste' }) }
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
