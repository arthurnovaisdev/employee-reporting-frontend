import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import axios from 'axios'
import { createServer } from 'vite'

globalThis.window = new EventTarget()

const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null } })
after(() => server.close())

const {
  changePassword,
  forgotPassword,
  login,
  loginRequestSchema,
  resetPassword,
} = await server.ssrLoadModule('/src/features/auth/auth.api.ts')
const { getTerminalResetTokenError } = await server.ssrLoadModule(
  '/src/features/auth/passwordErrors.ts',
)
const {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetTokenSchema,
  toChangePasswordRequest,
  toForgotPasswordRequest,
  toResetPasswordRequest,
} = await server.ssrLoadModule('/src/features/auth/passwordForms.ts')
const {
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  setAuthSession,
} = await server.ssrLoadModule('/src/features/auth/authStore.ts')
const { resolveApiBaseUrl } = await server.ssrLoadModule('/src/config/env.ts')
const { apiClient } = await server.ssrLoadModule('/src/lib/http/apiClient.ts')
const { getApiErrorMessage, getApiValidationDetails } = await server.ssrLoadModule('/src/lib/http/apiError.ts')

const response = (config, data = '', status = 200) => ({
  config,
  data,
  status,
  statusText: '',
  headers: {},
})

const session = (token, role = 'EMPLOYEE', passwordChanged = true) => ({
  token,
  name: 'Pessoa de Teste',
  role,
  passwordChanged,
})

test('configuração da API só usa localhost em desenvolvimento e exige HTTPS em produção', () => {
  assert.equal(resolveApiBaseUrl(undefined, true, false), 'http://localhost:8080/api')
  assert.throws(() => resolveApiBaseUrl(undefined, false, true), /obrigatória/)
  assert.throws(() => resolveApiBaseUrl('http://api.example.com/api', false, true), /HTTPS/)
  assert.throws(() => resolveApiBaseUrl('https://api.example.com', false, true), /base path \/api/)
  assert.equal(
    resolveApiBaseUrl('https://employee-reporting-api-v9fh.onrender.com/api/', false, true),
    'https://employee-reporting-api-v9fh.onrender.com/api',
  )
})

test('sessão autenticada permanece somente no store em memória', () => {
  clearAuthSession()
  assert.equal(getAuthSession(), null)
  setAuthSession(session('token-em-memoria'))
  assert.deepEqual(getAuthSession(), session('token-em-memoria'))
  assert.equal(getAccessToken(), 'token-em-memoria')
  clearAuthSession()
  assert.equal(getAccessToken(), null)
})

test('login aceita a senha atual sem mínimo, limita 100 caracteres e envia o DTO exato', async () => {
  assert.equal(loginRequestSchema.safeParse({ cpf: '12345678901', password: 'x' }).success, true)
  assert.equal(loginRequestSchema.safeParse({ cpf: '12345678901', password: ' '.repeat(2) }).success, false)
  assert.equal(loginRequestSchema.safeParse({ cpf: '12345678901', password: 'x'.repeat(100) }).success, true)
  assert.equal(loginRequestSchema.safeParse({ cpf: '12345678901', password: 'x'.repeat(101) }).success, false)

  setAuthSession(session('token-antigo'))
  const request = { cpf: '12345678901', password: 'x' }
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/auth/login')
    assert.equal(config.headers.get('Authorization'), undefined)
    assert.deepEqual(JSON.parse(config.data), request)
    return response(config, session('novo-token', 'ADMIN', false))
  }

  assert.deepEqual(await login(request), session('novo-token', 'ADMIN', false))
})

test('forgot password valida CPF, envia somente o DTO e não leva Bearer', async () => {
  assert.equal(forgotPasswordSchema.safeParse({ cpf: '12345678901' }).success, true)
  assert.equal(forgotPasswordSchema.safeParse({ cpf: '123.456.789-01' }).success, false)
  assert.deepEqual(toForgotPasswordRequest({ cpf: '12345678901', email: 'nao-enviar@example.com' }), {
    cpf: '12345678901',
  })

  setAuthSession(session('token-antigo-de-teste'))
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/auth/forgot-password')
    assert.equal(config.headers.get('Authorization'), undefined)
    assert.deepEqual(JSON.parse(config.data), { cpf: '12345678901' })
    return response(config)
  }

  await forgotPassword({ cpf: '12345678901' })
})

test('erros respeitam erro/detalhes, ignoram message e ocultam conteúdo interno em 500', () => {
  const config = { url: '/auth/forgot-password', method: 'post' }
  const error = (status, data) => new axios.AxiosError(
    'Falha simulada',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response(config, data, status),
  )

  const validationError = error(400, {
    detalhes: { cpf: 'CPF inválido.' },
    message: 'Este campo não pertence ao contrato.',
  })
  assert.deepEqual(getApiValidationDetails(validationError), { cpf: 'CPF inválido.' })
  assert.equal(getApiErrorMessage(validationError), 'CPF inválido.')
  assert.equal(
    getApiErrorMessage(error(400, { message: 'Não exibir.' })),
    'Confira os dados informados e tente novamente.',
  )
  const internalErrorMessage = getApiErrorMessage(error(500, { erro: 'stack trace e detalhes internos' }))
  assert.match(internalErrorMessage, /temporariamente indisponível/)
  assert.equal(internalErrorMessage.includes('stack trace'), false)
  assert.match(getApiErrorMessage(new axios.AxiosError('Network Error', 'ERR_NETWORK')), /conectar/)
})

test('401 em rota pública não encerra uma sessão válida', async () => {
  let unauthorized = 0
  window.addEventListener('auth:unauthorized', () => unauthorized++)
  setAuthSession(session('sessao-valida-de-teste'))
  apiClient.defaults.adapter = async (config) => {
    throw new axios.AxiosError(
      'Falha simulada',
      'ERR_BAD_RESPONSE',
      config,
      undefined,
      response(config, { erro: 'Solicitação inválida.' }, 401),
    )
  }

  await assert.rejects(forgotPassword({ cpf: '12345678901' }))
  assert.equal(getAccessToken(), 'sessao-valida-de-teste')
  assert.equal(unauthorized, 0)
})

test('reset exige token base64url de 43 caracteres e nova senha entre 6 e 100', async () => {
  const token = 'A'.repeat(43)
  const values = { newPassword: '123456', confirmNewPassword: '123456' }
  assert.equal(resetTokenSchema.safeParse(token).success, true)
  assert.equal(resetTokenSchema.safeParse('A'.repeat(42)).success, false)
  assert.equal(resetTokenSchema.safeParse('A'.repeat(44)).success, false)
  assert.equal(resetTokenSchema.safeParse(`${'A'.repeat(42)}+`).success, false)
  assert.equal(resetPasswordSchema.safeParse(values).success, true)
  assert.equal(resetPasswordSchema.safeParse({ newPassword: '12345', confirmNewPassword: '12345' }).success, false)
  assert.equal(resetPasswordSchema.safeParse({ newPassword: 'x'.repeat(101), confirmNewPassword: 'x'.repeat(101) }).success, false)
  assert.equal(resetPasswordSchema.safeParse({ ...values, confirmNewPassword: '654321' }).success, false)

  const request = toResetPasswordRequest(values, token)
  assert.deepEqual(request, { token, newPassword: '123456' })
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/auth/reset-password')
    assert.equal(config.headers.get('Authorization'), undefined)
    assert.deepEqual(JSON.parse(config.data), request)
    return response(config)
  }
  await resetPassword(request)
})

test('troca autenticada envia DTO exato com Bearer e aceita senha atual sem mínimo', async () => {
  const values = {
    currentPassword: 'x',
    newPassword: '123456',
    confirmNewPassword: '123456',
  }
  assert.equal(changePasswordSchema.safeParse(values).success, true)
  assert.equal(changePasswordSchema.safeParse({ ...values, currentPassword: 'x'.repeat(101) }).success, false)
  assert.equal(changePasswordSchema.safeParse({ ...values, newPassword: values.currentPassword }).success, false)

  const request = toChangePasswordRequest(values)
  assert.deepEqual(request, { currentPassword: 'x', newPassword: '123456' })
  setAuthSession(session('token-autenticado-de-teste', 'EMPLOYEE', false))
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'patch')
    assert.equal(config.url, '/users/me/password')
    assert.equal(config.headers.get('Authorization'), 'Bearer token-autenticado-de-teste')
    assert.deepEqual(JSON.parse(config.data), request)
    return response(config, '', 204)
  }
  await changePassword(request)
})

test('401 protegido encerra sessão; 403 preserva sessão', async () => {
  let unauthorized = 0
  let forbidden = 0
  window.addEventListener('auth:unauthorized', () => unauthorized++)
  window.addEventListener('auth:forbidden', () => forbidden++)

  for (const status of [401, 403]) {
    setAuthSession(session(`token-${status}`))
    apiClient.defaults.adapter = async (config) => {
      throw new axios.AxiosError(
        'Falha simulada',
        'ERR_BAD_RESPONSE',
        config,
        undefined,
        response(config, { erro: 'Falha simulada.' }, status),
      )
    }
    await assert.rejects(changePassword({ currentPassword: 'x', newPassword: '123456' }))
    assert.equal(getAccessToken(), status === 401 ? null : `token-${status}`)
  }

  assert.equal(unauthorized, 1)
  assert.equal(forbidden, 1)
})

test('reset trata somente o erro atual de token como terminal e usa mensagem neutra', () => {
  const config = { url: '/auth/reset-password', method: 'post' }
  const error = (status, data) => new axios.AxiosError(
    'Falha simulada',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response(config, data, status),
  )
  const expected = 'O link de recuperação é inválido ou expirou. Solicite um novo.'

  assert.equal(getTerminalResetTokenError(error(400, { erro: 'Token inválido ou expirado.' })), expected)
  assert.equal(getTerminalResetTokenError(error(400, { detalhes: { token: 'Token inválido.' } })), expected)
  assert.equal(getTerminalResetTokenError(error(404, { erro: 'Token inválido ou não encontrado.' })), null)
  assert.equal(getTerminalResetTokenError(error(400, { erro: 'A senha é inválida.' })), null)
})
