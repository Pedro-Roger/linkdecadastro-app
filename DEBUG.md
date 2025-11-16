# Como debugar a página em branco

## Passos para diagnosticar:

1. **Abra o navegador e acesse http://localhost:3000**

2. **Abra o Console do Navegador (F12 ou Cmd+Option+I)**

3. **Verifique os logs esperados:**
   - ✅ "🚀 Iniciando aplicação React..."
   - ✅ "✅ Elemento root encontrado"
   - ✅ "✅ ReactDOM.createRoot criado"
   - ✅ "✅ React renderizado com sucesso"
   - ✅ "✅ App component renderizando..."
   - ✅ "HomePage renderizando..."

4. **Se você ver erros no console:**
   - Anote o erro exato
   - Verifique em qual linha está acontecendo
   - Envie os erros para correção

5. **Se não aparecer NENHUM log:**
   - O JavaScript pode não estar sendo carregado
   - Verifique a aba Network no DevTools
   - Verifique se o arquivo `main.tsx` está sendo carregado

6. **Se aparecer apenas parte dos logs:**
   - O erro está entre o último log que apareceu e o próximo
   - Verifique o console para erros específicos

## Comandos úteis:

```bash
# Limpar cache e rebuild
rm -rf node_modules/.vite dist
npm run build

# Rodar em modo dev para ver erros em tempo real
npm run dev
```

## Problemas comuns:

1. **Erro: "Cannot read property of undefined"**
   - Algum componente pode estar tentando acessar propriedade inexistente
   - Verifique os componentes importados

2. **Erro: "useNavigate must be used within a Router"**
   - O BrowserRouter pode não estar envolvendo o App
   - Verifique main.tsx

3. **Página completamente branca sem erros**
   - Pode ser problema de CSS não carregando
   - Verifique se o index.css está sendo importado
   - Verifique se o Tailwind está configurado corretamente
