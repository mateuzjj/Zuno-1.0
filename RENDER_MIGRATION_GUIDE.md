# Guia: Migrar de Static Site para Web Service no Render

## Problema
O serviço está configurado como **Static Site**, que não executa o servidor Node.js necessário para SPA routing.

## Solução: Criar um novo Web Service

### Opção 1: Criar novo Web Service (Recomendado)

1. **No Render Dashboard:**
   - Vá para **Dashboard** → **New** → **Web Service**
   - Conecte ao mesmo repositório: `https://github.com/mateuzjj/Zuno`
   - Branch: `main`

2. **Configurações do Web Service:**
   - **Name**: `zuno` (ou outro nome se já existir)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Root Directory**: (deixe vazio)

3. **Environment Variables:**
   - Adicione se necessário:
     - `VITE_SPOTIFY_CLIENT_ID`: seu Client ID do Spotify

4. **Após criar:**
   - O Render vai fazer o build e iniciar o servidor Node.js
   - Verifique os logs para confirmar:
     ```
     [Server] Server running on port XXXX
     [Server] index.html exists: true
     ```

5. **Atualizar Custom Domain (se houver):**
   - Vá em **Settings** → **Custom Domains**
   - Remova o domínio do Static Site antigo
   - Adicione o domínio ao novo Web Service

6. **Deletar o Static Site antigo:**
   - Após confirmar que o Web Service está funcionando
   - Delete o Static Site antigo para evitar confusão

### Opção 2: Usar Netlify (Alternativa)

O projeto já está configurado para Netlify:

1. Vá para https://app.netlify.com
2. **New site from Git** → Conecte ao repositório
3. Configurações:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. O Netlify usará automaticamente o arquivo `public/_redirects` para SPA routing

## Verificação

Após criar o Web Service, teste:

1. Acesse: `https://zuno-acen.onrender.com/spotify/callback`
2. Deve retornar o HTML da aplicação (não 404)
3. Verifique os logs do Render para confirmar que o servidor está processando a requisição

## Arquivos Importantes

- ✅ `server.js` - Servidor Node.js para SPA routing
- ✅ `render.yaml` - Configuração do Render (será usado automaticamente)
- ✅ `public/_redirects` - Fallback para Netlify
- ✅ `netlify.toml` - Configuração do Netlify
