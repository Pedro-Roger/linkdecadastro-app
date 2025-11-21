# 🎯 Solução Simples para HostGator

## ✅ O Que Funciona

**Formulário de Inscrição Estático** (`enroll.html`)
- ✅ Funciona no HostGator (arquivo HTML estático)
- ✅ Não precisa de React para funcionar
- ✅ Busca cursos da API dinamicamente
- ✅ Permite inscrição sem login
- ✅ Cria conta automaticamente (senha padrão: 123456)

## 🔗 Como Funciona

### Links de Compartilhamento:
- **Formato**: `https://linkdecadastro.com.br/enroll.html?course={slug}`
- **Exemplo**: `https://linkdecadastro.com.br/enroll.html?course=como-utilizar-alimentadores-automaticos`

### Redirecionamento Automático:
- **`/c/{slug}`** → Redireciona automaticamente para `/enroll.html?course={slug}`
- **Evita 404**: O `.htaccess` faz o redirecionamento

## 📤 Build e Deploy

### 1. Build:
```bash
npm run build
```

### 2. Upload para HostGator:
- Upload de toda a pasta `dist/`
- **Importante**: Incluir `enroll.html` e `.htaccess`

### 3. Estrutura no Servidor:
```
public_html/
  ├── index.html (React)
  ├── enroll.html (Formulário estático) ✅
  ├── .htaccess ✅
  └── assets/
```

## ✅ Resultado

Quando alguém compartilhar um link de curso:
1. Link: `https://linkdecadastro.com.br/c/{slug}`
2. Servidor redireciona para: `/enroll.html?course={slug}`
3. Formulário abre automaticamente
4. Usuário preenche e se inscreve
5. Dados vão para o backend
6. **Sem 404!** ✅

## 🎉 Pronto!

A solução é simples e funciona no HostGator:
- ✅ Apenas `enroll.html` (já funciona)
- ✅ `.htaccess` redireciona `/c/{slug}` para `enroll.html`
- ✅ Links de compartilhamento apontam para `enroll.html`
- ✅ Sem complexidade desnecessária

