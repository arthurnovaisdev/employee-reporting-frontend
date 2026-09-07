import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import axios from 'axios'
import { createServer } from 'vite'

globalThis.window = new EventTarget()

const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null } })
after(() => server.close())

const { changePassword, forgotPassword, resetPassword } = await server.ssrLoadModule(
  '/src/features/auth/auth.api.ts',
)
const { getTerminalResetTokenError } = await server.ssrLoadModule(
  '/src/features/auth/passwordErrors.ts',
)
const {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  toChangePasswordRequest,
  toForgotPasswordRequest,
  toResetPasswordRequest,
} = await server.ssrLoadModule('/src/features/auth/passwordForms.ts')
const { apiClient } = await server.ssrLoadModule('/src/lib/http/apiClient.ts')
const { getAccessToken, setAccessToken } = await server.ssrLoadModule('/src/features/auth/tokenStore.ts')
const { getApiErrorMessage, getApiValidationDetails } = await server.ssrLoadModule('/src/lib/http/apiError.ts')

const response = (config, data = '', status = 200) => ({
  config,
  data,
  status,
  statusText: '',
  headers: {},
})

test('forgot password valida CPF e envia somente o ForgotPasswordRequestDTO', async () => {
  assert.equal(forgotPasswordSchema.safeParse({ cpf: '12345678901' }).success, true)
  assert.equal(forgotPasswordSchema.safeParse({ cpf: '123.456.789-01' }).success, false)
  assert.deepEqual(toForgotPasswordRequest({ cpf: '12345678901', email: 'não-enviar@example.com' }), {
    cpf: '12345678901',
  })

  setAccessToken('token-antigo-de-teste')
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/auth/forgot-password')
    assert.equal(config.headers.get('Authorization'), undefined)
    assert.deepEqual(JSON.parse(config.data), { cpf: '12345678901' })
    return response(config)
  }

  await forgotPassword({ cpf: '12345678901' })
})

test('forgot password apresenta usuário inexistente e ausência de e-mail conforme o backend', () => {
  const config = { url: '/auth/forgot-password', method: 'post' }
  const error = (status, erro) => new axios.AxiosError(
    'Falha simulada',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response(config, { erro }, status),
  )

  assert.equal(getApiErrorMessage(error(404, 'Usuário não encontrado.')), 'Usuário não encontrado.')
  assert.equal(
    getApiErrorMessage(error(400, 'Este usuário não possui um e-mail de contato cadastrado para recuperação.')),
    'Este usuário não possui um e-mail de contato cadastrado para recuperação.',
  )
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
  setAccessToken('sessao-valida-de-teste')
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

test('reset valida confirmação e envia somente token e newPassword', async () => {
  const values = {
    newPassword: 'NovaSenha123',
    confirmNewPassword: 'NovaSenha123',
  }
  assert.equal(resetPasswordSchema.safeParse(values).success, true)
  assert.equal(
    resetPasswordSchema.safeParse({ ...values, confirmNewPassword: 'SenhaDiferente123' }).success,
    false,
  )
  assert.equal(
    resetPasswordSchema.safeParse({ newPassword: 'curta', confirmNewPassword: 'curta' }).success,
    false,
  )

  const request = toResetPasswordRequest(values, 'token-do-link')
  assert.deepEqual(request, { token: 'token-do-link', newPassword: 'NovaSenha123' })

  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/auth/reset-password')
    assert.equal(config.headers.get('Authorization'), undefined)
    assert.deepEqual(JSON.parse(config.data), request)
    return response(config)
  }

  await resetPassword(request)
})

test('troca autenticada envia somente currentPassword e newPassword com Bearer', async () => {
  const values = {
    currentPassword: 'SenhaAtual123',
    newPassword: 'NovaSenha123',
    confirmNewPassword: 'NovaSenha123',
  }
  assert.equal(changePasswordSchema.safeParse(values).success, true)
  assert.equal(
    changePasswordSchema.safeParse({ ...values, newPassword: values.currentPassword }).success,
    false,
  )

  const request = toChangePasswordRequest(values)
  assert.deepEqual(request, {
    currentPassword: 'SenhaAtual123',
    newPassword: 'NovaSenha123',
  })

  setAccessToken('token-autenticado-de-teste')
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'patch')
    assert.equal(config.url, '/users/me/password')
    assert.equal(config.headers.get('Authorization'), 'Bearer token-autenticado-de-teste')
    assert.deepEqual(JSON.parse(config.data), request)
    return response(config, '', 204)
  }

  await changePassword(request)
})

test('token inválido, expirado e utilizado são classificados conforme o backend', () => {
  const config = { url: '/auth/reset-password', method: 'post' }
  const error = (status, erro) => new axios.AxiosError(
    'Falha simulada',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response(config, { erro }, status),
  )

  assert.equal(
    getTerminalResetTokenError(error(404, 'Token inválido ou não encontrado.')),
    'Token inválido ou não encontrado.',
  )
  assert.equal(
    getTerminalResetTokenError(error(400, 'O link de recuperação expirou. Solicite um novo.')),
    'O link de recuperação expirou. Solicite um novo.',
  )
  assert.equal(
    getTerminalResetTokenError(error(400, 'Este link de recuperação já foi utilizado.')),
    'Este link de recuperação já foi utilizado.',
  )
  assert.equal(getTerminalResetTokenError(error(400, 'A senha é inválida.')), null)
})
