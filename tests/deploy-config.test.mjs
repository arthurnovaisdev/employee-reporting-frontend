import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const netlify = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8')
const exampleEnvironment = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('Netlify executa o build do Vite, publica dist e aplica fallback da SPA', () => {
  assert.match(netlify, /command\s*=\s*"npm run build"/)
  assert.match(netlify, /publish\s*=\s*"dist"/)
  assert.match(netlify, /from\s*=\s*"\/\*"[\s\S]*to\s*=\s*"\/index\.html"[\s\S]*status\s*=\s*200/)
})

test('headers restringem scripts, framing, referrer, permissões e conexões externas', () => {
  const csp = netlify.match(/Content-Security-Policy\s*=\s*"([^"]+)"/)?.[1] ?? ''
  assert.match(csp, /default-src 'self'/)
  assert.match(csp, /script-src 'self'/)
  assert.equal(csp.includes("'unsafe-eval'"), false)
  assert.match(csp, /style-src 'self' 'unsafe-inline'/)
  assert.match(csp, /connect-src 'self' https:\/\/employee-reporting-api-v9fh\.onrender\.com/)
  assert.equal(csp.includes('supabase'), false)
  assert.equal(csp.includes('connect-src *'), false)
  assert.match(csp, /frame-ancestors 'none'/)
  assert.match(netlify, /Referrer-Policy\s*=\s*"no-referrer"/)
  assert.match(netlify, /X-Content-Type-Options\s*=\s*"nosniff"/)
  assert.match(netlify, /X-Frame-Options\s*=\s*"DENY"/)
  assert.match(netlify, /Permissions-Policy\s*=/)
  assert.match(index, /<meta name="referrer" content="no-referrer"\s*\/>/)
})

test('.env.example documenta somente a variável pública esperada', () => {
  const variables = [...exampleEnvironment.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1])
  assert.deepEqual([...new Set(variables)], ['VITE_API_BASE_URL'])
  assert.match(exampleEnvironment, /https:\/\/employee-reporting-api-v9fh\.onrender\.com\/api/)
})
