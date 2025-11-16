import { test, expect } from '@playwright/test'
import { createActiveEvent } from './utils/test-data'

test.describe('Fluxo público de inscrição', () => {
  test('visitante realiza cadastro com sucesso', async ({ page }) => {
    const event = await createActiveEvent()

    await page.goto(`/register/${event.linkId}`)

    await page.locator('input[name="name"]').fill('Participante E2E')
    await page.locator('input[name="cpf"]').fill('12345678901')
    await page.locator('input[name="phone"]').fill('(11) 99999-9999')
    await page.locator('input[name="email"]').fill(`participante+${Date.now()}@teste.com`)
    await page.locator('input[name="cep"]').fill('60000000')
    await page.locator('input[name="locality"]').fill('Bairro E2E')
    await page.locator('input[name="city"]').fill('Fortaleza')
    await page.locator('input[name="state"]').fill('CE')
    await page.locator('select[name="participantType"]').selectOption('PRODUTOR')
    await page.locator('input[name="pondCount"]').fill('2')
    await page.locator('input[name="waterDepth"]').fill('1.5')

    await page.getByRole('button', { name: 'Confirmar Cadastro' }).click()

    await expect(
      page.getByText('✓ Cadastro realizado com sucesso!')
    ).toBeVisible()
  })
})


