# 🔍 Por que o link compartilhado não funciona?

## 📋 Como Funciona Atualmente

### 1. **Link Gerado para Compartilhar**:
```
https://linkdecadastro.com.br/enroll.html?course=como-utilizar-alimentadores-automaticos
```

### 2. **O Que Deveria Acontecer**:

**No servidor HostGator:**
1. Usuário acessa: `/enroll.html?course={slug}`
2. Servidor procura arquivo: `public_html/enroll.html`
3. Se encontrar: ✅ Serve o HTML
4. Se não encontrar: ❌ Erro 404

**No navegador:**
1. HTML carrega
2. JavaScript executa
3. Busca curso na API usando o `slug` do parâmetro `?course=`
4. Exibe card do curso + formulário

## ⚠️ Por Que Pode Não Estar Funcionando

### Problema 1: Arquivo não está no servidor
**Causa**: `enroll.html` não foi enviado para o HostGator

**Como verificar**:
- Acessar FTP/cPanel do HostGator
- Verificar se existe `enroll.html` na raiz do `public_html/`

**Solução**:
```bash
npm run build
# Depois fazer upload de dist/enroll.html para o servidor
```

### Problema 2: Link está usando formato antigo
**Causa**: Link ainda está usando `/c/{slug}` em vez de `/enroll.html?course={slug}`

**Como verificar**:
- Ver qual link está sendo compartilhado
- Deve ser: `https://linkdecadastro.com.br/enroll.html?course={slug}`
- NÃO deve ser: `https://linkdecadastro.com.br/c/{slug}`

**Solução**:
- Os links já foram atualizados no código
- Se ainda estiver usando formato antigo, pode ser cache

### Problema 3: Curso não tem slug
**Causa**: Curso criado sem `slug` preenchido

**Como verificar**:
- Verificar no banco de dados se o curso tem `slug`
- Se não tiver, o link não funciona

**Solução**:
- Editar o curso e preencher o campo "URL personalizada" (slug)

### Problema 4: API não está acessível
**Causa**: Backend offline ou CORS bloqueando

**Como verificar**:
- Abrir console do navegador (F12)
- Verificar erros de rede
- Tentar acessar a API diretamente

**Solução**:
- Verificar se backend está online
- Verificar CORS no backend

## 🔧 Como Testar Agora

### Teste Local:
1. Abrir: `http://localhost:3000/enroll.html?course=como-utilizar-alimentadores-automaticos`
2. Deve mostrar card do curso + formulário

### Teste no Servidor:
1. Fazer build: `npm run build`
2. Verificar se `dist/enroll.html` existe
3. Fazer upload para HostGator
4. Acessar: `https://linkdecadastro.com.br/enroll.html?course={slug}`

## ✅ Checklist de Verificação

Antes de compartilhar, verificar:

- [ ] Curso tem `slug` preenchido?
- [ ] Build foi feito? (`npm run build`)
- [ ] `enroll.html` está em `dist/`?
- [ ] `enroll.html` foi enviado para HostGator?
- [ ] Link gerado usa `/enroll.html?course={slug}`?
- [ ] Backend está online?
- [ ] Testou o link antes de compartilhar?

## 🎯 Formato Correto do Link

**✅ CORRETO**:
```
https://linkdecadastro.com.br/enroll.html?course=como-utilizar-alimentadores-automaticos
```

**❌ ERRADO**:
```
https://linkdecadastro.com.br/c/como-utilizar-alimentadores-automaticos
```

## 💡 Dica

Sempre teste o link antes de compartilhar:
1. Copie o link gerado
2. Abra em uma aba anônima/privada
3. Verifique se carrega corretamente
4. Só então compartilhe

