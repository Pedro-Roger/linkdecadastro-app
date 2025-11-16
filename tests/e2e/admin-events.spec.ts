import { test, expect } from '@playwright/test'
import { createActiveEvent } from './utils/test-data'

test.describe('Painel administrativo - histórico de links', () => {
  test('admin visualiza e compartilha link criado', async ({ page }) => {
    const event = await createActiveEvent({
      title: 'Campanha E2E',
      description: 'Campanha criada automaticamente para testes E2E.'
    })

    await page.goto('/login')
    await page.locator('input[name="email"]').fill('admin@linkdecadastro.com')
    await page.locator('input[name="password"]').fill('admin123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.waitForURL('**/courses')

    await page.goto('/admin/events')

    await expect(page.getByRole('heading', { name: 'Histórico de Links' })).toBeVisible()
    await expect(page.getByText(event.title)).toBeVisible()

    await page.getByRole('button', { name: 'Compartilhar' }).first().click()

    await expect(page.getByText('Compartilhar link')).toBeVisible()
    await expect(page.getByText(event.title)).toBeVisible()

    await page.getByRole('button', { name: 'Fechar' }).click()
  })
})


