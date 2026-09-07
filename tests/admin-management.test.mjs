import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createServer } from 'vite'

const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null } })
after(() => server.close())
globalThis.window = new EventTarget()

const {
  getUser,
  getUsers,
  readUserPage,
  registerEmployee,
  setUserActive,
  toRegisterRequest,
} = await server.ssrLoadModule('/src/features/users/users.api.ts')
const {
  createCategory,
  getCategoryPage,
  readCategoryPage,
} = await server.ssrLoadModule('/src/features/reports/categories.api.ts')
const { apiClient } = await server.ssrLoadModule('/src/lib/http/apiClient.ts')
const { setAccessToken } = await server.ssrLoadModule('/src/features/auth/tokenStore.ts')
const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthContext.tsx')
const { PasswordChangedRoute, ProtectedRoute, RoleRoute } = await server.ssrLoadModule('/src/features/auth/RouteGuards.tsx')

const employee = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Ana Funcionária',
  cpf: '00000000000',
  contactEmail: 'ana@example.com',
  role: 'EMPLOYEE',
  active: true,
  passwordChanged: false,
}
const category = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name: 'Conduta interna',
  active: true,
}
const response = (config, data, status = 200) => ({ config, data, status, statusText: '', headers: {} })

test('listagem de usuários usa a paginação própria do endpoint', async () => {
  setAccessToken('fixture-admin')
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get')
    assert.equal(config.url, '/users')
    assert.deepEqual(config.params, { page: 2, size: 20, sort: 'name,asc' })
    assert.equal(config.headers.get('Authorization'), 'Bearer fixture-admin')
    return response(config, { content: [employee], number: 2, totalPages: 4, totalElements: 61, last: false })
  }

  const result = await getUsers(2)
  assert.deepEqual(result.users, [employee])
  assert.equal(result.hasNext, true)
  assert.equal(result.totalElements, 61)
})

test('adaptador de usuários aceita metadados Spring válidos e rejeita inconsistências', () => {
  const nested = readUserPage({ content: [employee], page: { number: 0, totalPages: 1, totalElements: 1 } })
  assert.equal(nested.hasNext, false)
  assert.throws(() => readUserPage({ items: [employee], number: 0, totalPages: 1 }))
  assert.throws(() => readUserPage({ content: [employee], number: 1, totalPages: 1 }))
  assert.throws(() => readUserPage({ content: [employee], number: 0, totalPages: 1, last: false }))
})

test('cadastro envia exatamente RegisterRequestDTO e não oferece role', async () => {
  const form = {
    name: '  Ana Funcionária  ',
    cpf: '00000000000',
    contactEmail: '',
    password: 'Senha1234',
    role: 'ADMIN',
  }
  assert.deepEqual(toRegisterRequest(form), {
    name: 'Ana Funcionária',
    cpf: '00000000000',
    contactEmail: null,
    password: 'Senha1234',
  })

  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/auth/register')
    assert.deepEqual(JSON.parse(config.data), {
      name: 'Ana Funcionária',
      cpf: '00000000000',
      contactEmail: null,
      password: 'Senha1234',
    })
    return response(config, undefined, 201)
  }
  await registerEmployee(form)
})

test('detalhe, ativação e desativação usam somente os endpoints atuais', async () => {
  const calls = []
  apiClient.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, data: config.data })
    if (config.method === 'get') return response(config, employee)
    return response(config, undefined, 204)
  }

  assert.deepEqual(await getUser(employee.id), employee)
  await setUserActive(employee.id, false)
  await setUserActive(employee.id, true)
  assert.deepEqual(calls, [
    { method: 'get', url: `/users/${employee.id}`, data: undefined },
    { method: 'patch', url: `/users/${employee.id}/deactivate`, data: undefined },
    { method: 'patch', url: `/users/${employee.id}/activate`, data: undefined },
  ])
})

test('categorias administrativas usam somente GET paginado e POST com CategoryRequestDTO', async () => {
  let call = 0
  apiClient.defaults.adapter = async (config) => {
    call++
    if (call === 1) {
      assert.equal(config.method, 'get')
      assert.equal(config.url, '/categories')
      assert.deepEqual(config.params, { page: 1, size: 20, sort: 'name,asc' })
      return response(config, { content: [category], number: 1, totalPages: 2, last: true })
    }
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/categories')
    assert.deepEqual(JSON.parse(config.data), { name: 'Conduta interna', active: true })
    return response(config, category, 201)
  }

  const page = await getCategoryPage(1)
  assert.deepEqual(page.categories, [category])
  assert.equal(page.hasNext, false)
  assert.deepEqual(await createCategory({ name: 'Conduta interna', active: true, extra: 'ignorar' }), category)
  assert.throws(() => readCategoryPage({ content: [category], number: 2, totalPages: 2 }))
})

test('rota administrativa de categorias bloqueia EMPLOYEE e permite ADMIN', () => {
  for (const [role, allowed] of [['EMPLOYEE', false], ['ADMIN', true]]) {
    window.sessionStorage = {
      getItem: () => JSON.stringify({ role, passwordChanged: true, token: 'fixture', name: 'Teste' }),
    }
    const client = new QueryClient()
    const h = React.createElement
    const html = renderToString(h(QueryClientProvider, { client }, h(AuthProvider, null,
      h(MemoryRouter, { initialEntries: ['/admin/categories'] }, h(Routes, null,
        h(Route, { element: h(ProtectedRoute) },
          h(Route, { element: h(PasswordChangedRoute) },
            h(Route, { element: h(RoleRoute, { allowedRoles: ['ADMIN'] }) },
              h(Route, { path: '/admin/categories', element: h('div', null, 'ADMIN_CATEGORIES') }),
            ),
          ),
        ),
      )),
    )))
    assert.equal(html.includes('ADMIN_CATEGORIES'), allowed)
    client.clear()
  }
})
