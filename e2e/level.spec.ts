import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('complete homeowner workflow, keyboard, calendar, print, and privacy', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const failed: string[] = []
  const requested: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
  })
  page.on('requestfailed', (r) => failed.push(r.url()))
  page.on('request', (r) => requested.push(r.url()))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'A clearer picture of your property assessment.' }),
  ).toBeVisible()
  expect(requested.some((u) => u.includes('/data/'))).toBe(false)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  await page.getByRole('link', { name: 'Check my assessment', exact: true }).click()
  const search = page.getByRole('combobox', { name: 'Find your Allston property' })
  await expect(search).toBeFocused()
  await search.fill('no-such-property-xyz')
  await expect(page.getByRole('status')).toContainText('No matching address')
  await search.fill('59 Brighton Avenue')
  await expect(page.getByRole('option')).toHaveCount(9)
  await search.press('ArrowDown')
  await expect(search).toHaveAttribute('aria-activedescendant', 'result-0')
  await search.press('Escape')
  await expect(search).toHaveAttribute('aria-expanded', 'false')
  await search.fill('59 Brighton Avenue unit 59-3')
  await expect(page.getByRole('option')).toHaveCount(1)
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(
    page.getByRole('heading', { name: '59 Brighton Av 59-3', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Recorded FY2026 assessment')).toBeVisible()
  await expect(page.getByText('What do the sales suggest?', { exact: true })).toBeVisible()
  await page.getByText('Show your work', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The calculation', exact: true })).toBeVisible()
  await expect(page.locator('.comp')).toHaveCount(5)
  await expect(
    page.getByRole('heading', { name: 'Assessment ratios: another question to explore' }),
  ).toBeVisible()
  const evidenceAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(evidenceAxe.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('evidence.png'), fullPage: true })
  await page.getByRole('button', { name: 'Continue to Deadlines', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Download calendar reminders (.ics)' }),
  ).toBeDisabled()
  await page.getByLabel('Fiscal year', { exact: true }).fill('2027')
  await page.getByLabel('First actual tax bill due date', { exact: true }).fill('2027-02-01')
  await page
    .getByLabel('Application filing date (actual or planned)', { exact: true })
    .fill('2027-01-29')
  await expect(page.getByText('Monday, February 1, 2027', { exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download calendar reminders (.ics)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('level-deadlines.ics')
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream!) chunks.push(chunk)
  const calendar = Buffer.concat(chunks).toString()
  expect(calendar).toContain('DTSTART;VALUE=DATE:20270201')
  expect(calendar).toContain('Verify with the Board of Assessors')
  await page.getByRole('button', { name: 'Continue to Prepare Form 128', exact: true }).click()
  await page.getByLabel('Your claimed fair cash value ($)', { exact: true }).fill('490000')
  await page
    .getByLabel('Your explanation', { exact: true })
    .fill('Demo review: verify these sales and the condition on the valuation date.')
  await page
    .getByLabel('Condition notes and public-record corrections', { exact: true })
    .fill('Demo note: ask the assessor to verify recorded living area.')
  await page.getByLabel('Gather dated condition photos', { exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByLabel('Gather dated condition photos', { exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Continue to Packet & review', exact: true }).click()
  await expect(
    page.getByText('Demo review: verify these sales and the condition on the valuation date.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByText('Checked: Gather dated condition photos', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Before you file', exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Continue to official Form 128', exact: true }),
  ).toHaveAttribute('href', 'https://www.mass.gov/files/documents/2018/01/09/form128_0.pdf')
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.packet-cover')).toBeVisible()
  await expect(page.locator('.site-header')).toBeHidden()
  await page.pdf({
    path: testInfo.outputPath('level-evidence-packet.pdf'),
    format: 'Letter',
    printBackground: true,
  })
  await page.emulateMedia({ media: 'screen' })
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 })
  expect(requested.filter((u) => !u.startsWith('http://127.0.0.1:5173'))).toEqual([])
  await page.getByRole('button', { name: 'Clear my data', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Clear this session?' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Clear my data', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Clear session', exact: true }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Keep working', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'A clearer picture of your property assessment.' }),
  ).toBeVisible()
  expect(errors).toEqual([])
  expect(failed).toEqual([])
})

for (const width of [375, 768, 1024, 1440])
  test(`responsive and accessible at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Try a demo property' }).click()
    await expect(
      page.getByRole('heading', { name: '59 Brighton Av 59-3', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`property-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: '2 Deadlines', exact: true }).click()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '3 Prepare Form 128', exact: true }).click()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
test('data loading failure is recoverable', async ({ page }) => {
  await page.route('**/data/parcels.json', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a demo property' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await expect(page.getByRole('button', { name: 'Reload and retry' })).toBeVisible()
})
test('malformed record is explained without crashing', async ({ page }) => {
  await page.route('**/data/parcels.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[{"pid":"broken"}]' }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a demo property' }).click()
  await expect(page.getByRole('alert')).toContainText('invalid or duplicate record')
})
