# Checklist de Configuração do Render Web Service

## ✅ Configurações Corretas (da imagem)

1. **Repository**: `mateuzjj / Zuno` ✅
2. **Name**: `Zuno` ✅
3. **Language**: `Node` ✅
4. **Branch**: `main` ✅
5. **Start Command**: `node server.js` ✅
6. **Root Directory**: Vazio ✅
7. **Environment Variable**: `VITE_SPOTIFY_CLIENT_ID` configurado ✅

## ⚠️ Ajuste Necessário

### Build Command

**Atual na imagem**: `npm install; npm run build`  
**Recomendado**: `npm install && npm run build`

**Por quê?**
- `;` executa os comandos sequencialmente mesmo se um falhar
- `&&` só executa o próximo comando se o anterior for bem-sucedido (mais seguro)

**Como corrigir:**
1. No Render Dashboard, vá em **Settings**
2. Encontre **Build Command**
3. Altere para: `npm install && npm run build`
4. Salve as alterações

## 📋 Verificações Pós-Deploy

Após fazer o deploy, verifique nos **Logs**:

1. **Build bem-sucedido:**
   ```
   ✓ built in Xs
   ```

2. **Servidor iniciado:**
   ```
   [Server] Server running on port XXXX
   [Server] Serving files from: /opt/render/project/src/dist
   [Server] index.html exists: true
   ```

3. **Teste a rota:**
   - Acesse: `https://zuno-acen.onrender.com/spotify/callback`
   - Deve retornar HTML (não 404)
   - Nos logs deve aparecer:
     ```
     [Server] Request: GET /spotify/callback
     [Server] Served index.html for route: /spotify/callback
     ```

## 🔍 Se ainda houver problemas

1. **Verificar se o build gerou o `dist/`:**
   - Nos logs, procure por erros de build
   - Verifique se `dist/index.html` foi criado

2. **Verificar se o servidor está rodando:**
   - Nos logs, deve aparecer a mensagem de servidor iniciado
   - Se não aparecer, verifique se há erros no `server.js`

3. **Verificar porta:**
   - O Render define `process.env.PORT` automaticamente
   - O servidor deve usar essa porta (não hardcoded)
