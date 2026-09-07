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
const { setAccessToken } = await server.ssrLoadModule('/src/features/auth/tokenStore.ts')
const { getApiErrorMessage } = await server.ssrLoadModule('/src/lib/http/apiError.ts')

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
