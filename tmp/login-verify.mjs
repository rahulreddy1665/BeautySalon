import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'login-verify')
mkdirSync(OUT, { recursive: true })

const widths = [360, 390, 768, 1024, 1440]
const BASE = process.env.LOGIN_URL || 'http://localhost:5173/login'

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
})

const report = []

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 740 : 900 },
    colorScheme: 'dark', // system prefers dark — login must still be light
  })
  const page = await context.newPage()
  // Saved theme = dark; must not flash dark or stick on /login
  await page.addInitScript(() => {
    localStorage.setItem(
      'persist:beauty-salon',
      JSON.stringify({
        auth: JSON.stringify({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
        settings: JSON.stringify({ themeMode: 'dark' }),
        _persist: JSON.stringify({ version: -1, rehydrated: true }),
      }),
    )
  })
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1200)

  const file = `light-${width}.png`
  await page.screenshot({ path: join(OUT, file), fullPage: false })

  const metrics = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    const toggle = document.querySelector('[aria-label*="theme" i], button[class*="theme"]')
    const particles = document.getElementById('login-particles')
    return {
      darkClass: root.classList.contains('dark'),
      themeModePersisted: (() => {
        try {
          const raw = localStorage.getItem('persist:beauty-salon')
          if (!raw) return null
          const parsed = JSON.parse(raw)
          const settings =
            typeof parsed.settings === 'string'
              ? JSON.parse(parsed.settings)
              : parsed.settings
          return settings?.themeMode ?? null
        } catch {
          return null
        }
      })(),
      themeColor: document
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute('content'),
      hasThemeToggle: Boolean(toggle),
      hasParticles: Boolean(particles),
      horizontalOverflow:
        Math.max(root.scrollWidth, body.scrollWidth) > window.innerWidth + 1,
      bg: getComputedStyle(document.body).backgroundColor,
    }
  })

  report.push({ width, file, ...metrics })
  await context.close()
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
