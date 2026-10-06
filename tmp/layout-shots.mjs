import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9334
const OUT = new URL('./layout-shots/', import.meta.url).pathname
const APP = 'http://localhost:5173'

let id = 0
const pending = new Map()

function send(ws, method, params = {}, sessionId) {
  const messageId = ++id
  const payload = { id: messageId, method, params }
  if (sessionId) payload.sessionId = sessionId
  ws.send(JSON.stringify(payload))
  return new Promise((resolve, reject) => {
    pending.set(messageId, { resolve, reject })
  })
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/bs-cdp-profile-2',
    '--no-first-run',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function version() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return res.json()
    } catch {
      /* retry */
    }
    await delay(200)
  }
  throw new Error('Chrome DevTools did not start')
}

const info = await version()
const ws = new WebSocket(info.webSocketDebuggerUrl)
await new Promise((resolve) => {
  ws.addEventListener('open', resolve)
})
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const waiter = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)))
    else waiter.resolve(msg.result)
  }
})

const { targetId } = await send(ws, 'Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send(ws, 'Target.attachToTarget', {
  targetId,
  flatten: true,
})

async function evalJs(expression) {
  const result = await send(
    ws,
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  )
  return result.result?.value
}

async function shot(name) {
  const { data } = await send(
    ws,
    'Page.captureScreenshot',
    { format: 'png' },
    sessionId,
  )
  await writeFile(`${OUT}${name}.png`, Buffer.from(data, 'base64'))
}

async function go(path) {
  await send(ws, 'Page.navigate', { url: `${APP}${path}` }, sessionId)
  await delay(1200)
}

async function setViewport(width, height, standalone) {
  await send(
    ws,
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: width < 1024 },
    sessionId,
  )
  await send(
    ws,
    'Emulation.setEmulatedMedia',
    {
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'display-mode', value: standalone ? 'standalone' : 'browser' },
      ],
    },
    sessionId,
  )
}

const loginRes = await fetch('http://127.0.0.1:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'admin@example.com',
    password: 'Admin@123',
  }),
})
const loginJson = await loginRes.json()
if (!loginJson.success) throw new Error('login failed')
const persist = JSON.stringify({
  auth: JSON.stringify({
    token: loginJson.data.token,
    user: loginJson.data.user,
    isAuthenticated: true,
  }),
  settings: JSON.stringify({ themeMode: 'light', sidebarCollapsed: false }),
  _persist: JSON.stringify({ version: -1, rehydrated: true }),
})

await mkdir(OUT, { recursive: true })
await send(ws, 'Page.enable', {}, sessionId)
await send(ws, 'Runtime.enable', {}, sessionId)

async function setTheme(mode) {
  const next = JSON.stringify({
    auth: JSON.stringify({
      token: loginJson.data.token,
      user: loginJson.data.user,
      isAuthenticated: true,
    }),
    settings: JSON.stringify({ themeMode: mode, sidebarCollapsed: false }),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  })
  await evalJs(`localStorage.setItem('persist:beauty-salon', ${JSON.stringify(next)})`)
}

await setViewport(1280, 900, false)
await go('/login')
await evalJs(`localStorage.setItem('persist:beauty-salon', ${JSON.stringify(persist)})`)
await go('/')
await delay(1500)
console.log('after login', await evalJs('location.pathname'))

for (const width of [1280, 1440]) {
  await setViewport(width, 900, false)
  await go('/')
  await shot(`desktop-${width}-dashboard`)
  await go('/billing/new')
  await shot(`desktop-${width}-newbill`)
}

const mobile = [
  [320, 'browser', false],
  [360, 'browser', false],
  [390, 'browser', false],
  [430, 'browser', false],
  [768, 'browser', false],
  [390, 'pwa', true],
]
for (const [width, mode, standalone] of mobile) {
  await setViewport(width, 800, standalone)
  await setTheme(mode === 'pwa' ? 'dark' : 'light')
  await go('/')
  await delay(400)
  await shot(`mobile-${width}-${mode}-header`)
  await go('/billing/new')
  await delay(800)
  await shot(`mobile-${width}-${mode}-bill`)
}

await setViewport(390, 800, false)
await go('/billing/new')
await delay(500)
await evalJs(`
  const buttons = [...document.querySelectorAll('button')]
  const add = buttons.find((b) => /add/i.test(b.textContent || ''))
  add?.click()
`)
await delay(400)
const payable = await evalJs(
  `[...document.querySelectorAll('button, p')].some((el) => (el.textContent || '').includes('Payable'))`,
)
console.log('payable visible', payable)
await evalJs(`
  const pay = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Payable'))
  pay?.click()
`)
await delay(500)
await shot('mobile-390-summary-sheet')
await evalJs(`
  const input = document.querySelector('input')
  input?.focus()
  input?.scrollIntoView({ block: 'center' })
`)
await shot('mobile-390-focus')

await go('/billing')
await evalJs('location.reload()')
await delay(1500)
console.log('reload billing', await evalJs('location.pathname + location.search'))
await go('/appointments?date=2026-10-06')
await evalJs('location.reload()')
await delay(1500)
console.log('reload appointments', await evalJs('location.pathname + location.search'))
await go('/reports/sales')
await evalJs('location.reload()')
await delay(1500)
console.log('reload sales', await evalJs('location.pathname'))
await go('/settings/tax')
await evalJs('location.reload()')
await delay(1500)
console.log('reload tax', await evalJs('location.pathname'))

chrome.kill()
ws.close()
process.exit(0)
