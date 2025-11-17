# Configuração de CORS no Backend

## Problema
O backend está bloqueando requisições do domínio `https://linkdecadastro.com.br` por falta de configuração de CORS.

## Solução no Backend NestJS

No arquivo `main.ts` do seu backend NestJS, configure o CORS assim:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração de CORS
  app.enableCors({
    origin: [
      'https://linkdecadastro.com.br',
      'https://www.linkdecadastro.com.br',
      'http://localhost:3000', // Para desenvolvimento local
      'http://localhost:5173', // Para desenvolvimento com Vite
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(process.env.PORT || 3333);
}
bootstrap();
```

## Alternativa: Permitir todos os domínios (apenas para desenvolvimento/teste)

⚠️ **ATENÇÃO:** Use apenas em desenvolvimento/teste, não em produção!

```typescript
app.enableCors({
  origin: true, // Permite todos os domínios
  credentials: true,
});
```

## Verificar se está funcionando

Após configurar, faça o deploy do backend e teste novamente. O erro de CORS deve desaparecer.

## Domínios que devem ser permitidos

- `https://linkdecadastro.com.br` (produção)
- `https://www.linkdecadastro.com.br` (com www)
- `http://localhost:3000` (desenvolvimento)
- `http://localhost:5173` (desenvolvimento Vite)

