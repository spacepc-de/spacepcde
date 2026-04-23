import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('redirects the root URL permanently to the default locale homepage', async ({
    page,
    request,
  }) => {
    const response = await request.get('http://localhost:3000', {
      maxRedirects: 0,
    })

    expect(response?.status()).toBe(301)
    expect(response.headers().location).toBe('/de')

    await page.goto('http://localhost:3000')
    await expect(page).toHaveURL('http://localhost:3000/de')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page).toHaveTitle(/spacepc\.de/)

    const heading = page.locator('h1').first()

    await expect(heading).toContainText('Technische Inhalte und direkter IT Service')
  })

  test('renders the english locale with the correct document language', async ({ page }) => {
    await page.goto('http://localhost:3000/en')

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveTitle(/spacepc\.de/)

    const heading = page.locator('h1').first()

    await expect(heading).toContainText('Technical content and direct IT service')
  })
})
