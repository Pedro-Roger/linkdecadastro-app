import { execSync } from 'child_process'
import { FullConfig } from '@playwright/test'

export default async function globalSetup(_config: FullConfig) {
  try {
    console.log('🧹 Resetando banco de dados para testes E2E...')
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit'
    })

    console.log('🌱 Executando seed padrão...')
    execSync('npm run prisma:seed', {
      stdio: 'inherit'
    })
  } catch (error) {
    console.error('Erro ao preparar ambiente E2E:', error)
    throw error
  }
}


