# 🔍 Diagnóstico: Por que o link compartilhado não funciona?

## 📋 Fluxo Esperado

### Quando você compartilha um curso:

1. **Link gerado**: `https://linkdecadastro.com.br/enroll.html?course={slug}`
   - Exemplo: `https://linkdecadastro.com.br/enroll.html?course=como-utilizar-alimentadores-automaticos`

2. **O que deveria acontecer**:
   - Servidor encontra `enroll.html` (arquivo físico)
   - Serve o HTML
   - JavaScript busca curso na API usando o `slug` do parâmetro `?course=`
   - Exibe card do curso + formulário

## ⚠️ Possíveis Problemas

### Problema 1: Arquivo `enroll.html` não está no servidor
**Sintoma**: Erro 404 ao acessar `/enroll.html`

**Solução**:
- Verificar se `enroll.html` está na pasta `dist/` após o build
- Fazer upload do arquivo para o servidor HostGator

### Problema 2: Link está usando `/c/{slug}` em vez de `/enroll.html?course={slug}`
**Sintoma**: Erro 404 ao acessar `/c/{slug}`

**Verificação**:
- O `.htaccess` redireciona `/c/{slug}` → `/enroll.html?course={slug}`
- Mas se o `.htaccess` não estiver funcionando no HostGator, dá 404

**Solução**:
- Usar sempre `/enroll.html?course={slug}` nos links compartilhados
- Não depender do redirecionamento do `.htaccess`

### Problema 3: API não está acessível
**Sintoma**: Página carrega mas não mostra o curso

**Verificação**:
- Abrir console do navegador (F12)
- Verificar erros de CORS ou falha na requisição à API

**Solução**:
- Verificar se a API está online
- Verificar CORS no backend

### Problema 4: Curso não tem `slug`
**Sintoma**: Link não funciona porque o curso não tem slug

**Verificação**:
- Verificar se o curso tem `slug` preenchido no banco de dados

## 🔧 Como Testar

### Teste 1: Acessar diretamente
```
https://linkdecadastro.com.br/enroll.html?course=como-utilizar-alimentadores-automaticos
```

**O que deve acontecer**:
- ✅ Página carrega
- ✅ Mostra card do curso
- ✅ Mostra formulário

### Teste 2: Verificar arquivo no servidor
- Acessar via FTP/cPanel
- Verificar se `enroll.html` existe na raiz do `public_html`

### Teste 3: Verificar console do navegador
- Abrir F12 → Console
- Verificar erros ao carregar a página
- Verificar se a requisição à API funciona

## 📝 Checklist

- [ ] `enroll.html` está em `dist/` após build?
- [ ] `enroll.html` foi enviado para o servidor?
- [ ] `.htaccess` está no servidor?
- [ ] Link compartilhado usa `/enroll.html?course={slug}`?
- [ ] Curso tem `slug` preenchido?
- [ ] API está online e acessível?
- [ ] CORS está configurado no backend?

## 🎯 Link Correto para Compartilhar

**Formato correto**:
```
https://linkdecadastro.com.br/enroll.html?course={slug-do-curso}
```

**NÃO usar**:
```
https://linkdecadastro.com.br/c/{slug}  ❌ (pode dar 404)
```

