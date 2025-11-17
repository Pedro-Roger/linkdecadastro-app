# 🚀 Guia de Deploy Automático com Git cPanel

## 📋 Pré-requisitos

1. **Node.js instalado no cPanel**
   - Acesse: cPanel → **Software** → **Setup Node.js App**
   - Crie uma aplicação Node.js (versão 18 ou superior)
   - Anote o caminho onde o Node.js está instalado

2. **Repositório Git configurado no cPanel**
   - Acesse: cPanel → **Files** → **Git Version Control**
   - Crie ou conecte seu repositório

## ⚙️ Configuração do Deploy Automático

### Passo 1: Descobrir seu usuário do cPanel

1. Acesse o cPanel
2. Vá em **File Manager**
3. Navegue até `public_html`
4. Veja o caminho completo na barra de endereço
5. O caminho será algo como: `/home/seu_usuario/public_html/`

### Passo 2: Configurar o arquivo `.cpanel.yml`

1. Abra o arquivo `.cpanel.yml` na raiz do projeto
2. Localize a linha:
   ```yaml
   - export DEPLOYPATH=/home/USUARIO/public_html/
   ```
3. Substitua `USUARIO` pelo seu usuário do cPanel
4. Exemplo:
   ```yaml
   - export DEPLOYPATH=/home/pedro123/public_html/
   ```

### Passo 3: Commit e Push

```bash
# Adiciona os arquivos de configuração
git add .cpanel.yml .htaccess DEPLOY_AUTOMATICO.md

# Faz commit
git commit -m "feat: configura deploy automático com Git cPanel"

# Faz push
git push
```

### Passo 4: Configurar o repositório no cPanel

1. Acesse: cPanel → **Files** → **Git Version Control**
2. Se já tem um repositório:
   - Clique em **Manage** no seu repositório
   - Certifique-se de que está na branch `main` ou `master`
   - O cPanel automaticamente detecta o arquivo `.cpanel.yml`
3. Se não tem repositório:
   - Clique em **Create**
   - Escolha **Clone a Repository**
   - Cole a URL do seu repositório GitHub
   - Escolha o diretório (ex: `repositories/linkdecadastro-app`)
   - Clique em **Create**

## 🔄 Como Funciona o Deploy Automático

Quando você faz `git push` para o repositório:

1. ✅ O cPanel detecta o push
2. ✅ Executa os comandos do arquivo `.cpanel.yml`
3. ✅ Instala dependências (`npm install`)
4. ✅ Gera o build (`npm run build`)
5. ✅ Copia arquivos da pasta `dist/` para `public_html/`
6. ✅ Configura permissões corretas
7. ✅ Seu site é atualizado automaticamente!

## 📝 Estrutura do Arquivo .cpanel.yml

O arquivo `.cpanel.yml` contém:

- **DEPLOYPATH**: Caminho onde os arquivos serão deployados
- **npm install**: Instala todas as dependências necessárias
- **npm run build**: Gera os arquivos estáticos na pasta `dist/`
- **cp -R dist/***: Copia todos os arquivos para `public_html/`
- **chmod**: Define permissões corretas

## ⚠️ Importante

1. **Primeira vez**: Você precisa ajustar o `USUARIO` no `.cpanel.yml`
2. **Node.js**: Certifique-se de que o Node.js está instalado no cPanel
3. **Permissões**: O cPanel gerencia as permissões automaticamente
4. **Build**: O build é feito no servidor, então precisa ter Node.js instalado

## 🔍 Troubleshooting

### Erro: "Node.js não encontrado"
- Instale Node.js no cPanel: **Software** → **Setup Node.js App**

### Erro: "pasta dist não foi criada"
- Verifique se o `npm run build` está funcionando
- Verifique os logs no cPanel → **Git Version Control** → **Deploy Logs**

### Arquivos não aparecem no site
- Verifique se o caminho `DEPLOYPATH` está correto
- Verifique as permissões dos arquivos
- Verifique os logs de deploy no cPanel

### Site não carrega após deploy
- Verifique se o arquivo `.htaccess` foi copiado
- Verifique se o `index.html` está em `public_html/`
- Verifique os logs de erro do servidor

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs de deploy no cPanel
2. Verifique se o Node.js está instalado
3. Verifique se o caminho `DEPLOYPATH` está correto
4. Entre em contato com o suporte da Hostgator se necessário

