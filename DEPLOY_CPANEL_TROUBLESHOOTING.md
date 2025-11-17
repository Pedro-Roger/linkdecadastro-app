# 🔧 Solução de Problemas de Deploy no cPanel

## ❌ Erro: "The system cannot deploy"

### Causa
O cPanel verifica o repositório **no servidor**, não no seu repositório local. Se o repositório do servidor tiver mudanças não commitadas ou não estiver sincronizado, o deploy não funcionará.

## ✅ Soluções

### Solução 1: Fazer Pull no cPanel (Recomendado)

1. **Acesse o cPanel da Hostgator**
2. **Vá em:** Files → **Git Version Control**
3. **Encontre seu repositório** (linkdecadastro-app)
4. **Clique em "Manage"** (ou "Gerenciar")
5. **Clique em "Pull or Deploy"** (ou "Pull ou Deploy")
6. **Escolha "Pull Changes"** (ou "Puxar Mudanças")
7. **Aguarde** a sincronização

Isso irá:
- Atualizar o repositório no servidor com as mudanças do GitHub
- Baixar o `.cpanel.yml` atualizado
- Limpar qualquer mudança não commitada

### Solução 2: Verificar Mudanças Não Commitadas

1. **No cPanel**, vá em **Git Version Control** → **Manage**
2. **Verifique** se há mudanças não commitadas
3. Se houver, você pode:
   - **Descartar** as mudanças (git reset --hard)
   - Ou fazer commit delas

### Solução 3: Recriar o Repositório (Se nada funcionar)

1. **Delete o repositório atual** no cPanel
2. **Crie um novo** clonando do GitHub:
   ```
   https://github.com/Pedro-Roger/linkdecadastro-app.git
   ```
3. **Certifique-se** de selecionar a branch `main`

## 📋 Checklist

Antes de fazer deploy, verifique:

- [ ] O arquivo `.cpanel.yml` está commitado no GitHub
- [ ] Você fez `git push` recentemente
- [ ] O repositório no cPanel está atualizado (fez Pull)
- [ ] Não há mudanças não commitadas no servidor
- [ ] A branch configurada é `main` (ou `master`)

## 🔍 Como Verificar se o .cpanel.yml Está Correto

No cPanel, após fazer Pull, você pode verificar:
1. **Git Version Control** → **Manage** → **Browse Files**
2. Procure pelo arquivo `.cpanel.yml` na raiz
3. Verifique se está presente e com o conteúdo correto

## ⚠️ Importante

- O deploy automático só funciona após fazer **Pull** no cPanel
- Mudanças feitas diretamente no servidor podem causar conflitos
- Sempre faça mudanças via Git (local → push → cPanel pull → deploy)

