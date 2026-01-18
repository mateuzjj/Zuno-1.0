# Troubleshooting Render.com 404 Error

## Problema
O servidor está retornando 404 para `/spotify/callback` mesmo após as correções.

## Verificações Necessárias

### 1. Verificar se o Render está usando o servidor Node.js

No **Render Dashboard**:
1. Vá para seu serviço `zuno`
2. Vá em **Settings**
3. Verifique:
   - **Environment**: Deve ser `Node`
   - **Build Command**: Deve ser `npm install && npm run build`
   - **Start Command**: Deve ser `node server.js`

Se estiver configurado como **Static Site**, mude para **Web Service**.

### 2. Verificar se o build está gerando o `dist/`

No **Render Dashboard**:
1. Vá para **Logs**
2. Verifique se o build está completando com sucesso
3. Procure por mensagens como:
   - `✓ built in Xs`
   - `dist/index.html` deve existir

### 3. Verificar se o servidor está rodando

Nos **Logs** do Render, procure por:
```
[Server] Server running on port XXXX
[Server] Serving files from: /opt/render/project/src/dist
[Server] index.html exists: true
```

### 4. Verificar requisições

Nos **Logs** do Render, quando acessar `/spotify/callback`, você deve ver:
```
[Server] Request: GET /spotify/callback
[Server] Served index.html for route: /spotify/callback
```

## Solução Alternativa: Usar _redirects

Se o servidor Node.js não estiver funcionando, você pode voltar para **Static Site** e usar o arquivo `_redirects`:

1. No Render Dashboard, mude de volta para **Static Site**
2. Certifique-se de que `public/_redirects` contém:
   ```
   /*    /index.html   200
   ```
3. O Vite copiará automaticamente este arquivo para `dist/_redirects`

## Verificar Configuração Atual

Execute no terminal local para verificar se tudo está correto:

```bash
# Verificar se server.js existe
ls -la server.js

# Verificar se render.yaml está correto
cat render.yaml

# Testar build localmente
npm run build

# Verificar se dist/index.html existe
ls -la dist/index.html

# Testar servidor localmente
node server.js
# Em outro terminal:
curl http://localhost:3002/spotify/callback
```

## Se Nada Funcionar

1. **Deletar e recriar o serviço no Render** com as configurações corretas
2. **Usar Netlify** ao invés do Render (já tem configuração pronta)
3. **Verificar se há algum proxy/CDN** (Cloudflare) que possa estar interferindo
