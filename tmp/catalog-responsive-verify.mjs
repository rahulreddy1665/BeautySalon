import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'catalog-verify')
mkdirSync(OUT, { recursive: true })

const BASE = process.env.APP_URL || 'http://localhost:5173'
const API = process.env.API_URL || 'http://localhost:8080/api'
const widths = [360, 768, 1024, 1280]
const themes = ['light', 'dark']
const routes = [
  { path: '/services', key: 'services' },
  { path: '/inventory', key: 'products' },
  { path: '/billing/new', key: 'billing' },
]

async function loginToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'Admin@123',
    }),
  })
  const json = await res.json()
  const token = json?.data?.token
  const user = json?.data?.user
  if (!token || !user) throw new Error(`login failed: ${JSON.stringify(json)}`)
  return { token, user }
}

const { token, user } = await loginToken()

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
})

const report = []

for (const theme of themes) {
  for (const width of widths) {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport: { width, height: width < 768 ? 800 : 900 },
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      })
      const page = await context.newPage()
      await page.addInitScript(
        ({ token, user, theme }) => {
          localStorage.setItem(
            'persist:beauty-salon',
            JSON.stringify({
              auth: JSON.stringify({
                token,
                user,
                isAuthenticated: true,
              }),
              settings: JSON.stringify({ themeMode: theme }),
              billingCart: JSON.stringify({
                customerId: null,
                customerName: 'Walk-in',
                walkIn: true,
                walkInPhone: '',
                appointmentId: null,
                lines: [],
                serviceDiscount: { type: 'amount', value: 0 },
                productDiscount: { type: 'amount', value: 0 },
                loyaltyRedeemPoints: 0,
                pointsValueRatio: 1,
                tip: 0,
                tipStaffId: null,
                paymentMode: null,
                cashReceived: 0,
                notes: '',
              }),
              _persist: JSON.stringify({ version: -1, rehydrated: true }),
            }),
          )
        },
        { token, user, theme },
      )

      const url = `${BASE}${route.path}`
      let error = null
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
        await page.waitForTimeout(900)
        // Open Categories / Combos tabs on services for a quick smoke
        if (route.key === 'services') {
          const cats = page.getByRole('button', { name: /^Categories$/i })
          if (await cats.count()) {
            await cats.first().click()
            await page.waitForTimeout(400)
          }
          const combos = page.getByRole('button', { name: /^Combos$/i })
          if (await combos.count()) {
            await combos.first().click()
            await page.waitForTimeout(400)
          }
          const services = page.getByRole('button', { name: /^Services$/i })
          if (await services.count()) await services.first().click()
          await page.waitForTimeout(300)
        }
      } catch (e) {
        error = String(e?.message || e)
      }

      const file = `${route.key}-${theme}-${width}.png`
      try {
        await page.screenshot({ path: join(OUT, file), fullPage: false })
      } catch {
        /* ignore */
      }

      const metrics = await page
        .evaluate(() => {
          const root = document.documentElement
          const body = document.body
          return {
            darkClass: root.classList.contains('dark'),
            title: document.title,
            horizontalOverflow:
              Math.max(root.scrollWidth, body.scrollWidth) > window.innerWidth + 1,
            hasMain: Boolean(document.querySelector('main')),
            bodyTextLen: (body.innerText || '').trim().length,
          }
        })
        .catch(() => ({ error: 'evaluate failed' }))

      report.push({
        route: route.path,
        theme,
        width,
        file,
        error,
        ...metrics,
      })
      await context.close()
    }
  }
}

await browser.close()
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
