# Comparativo: Função Radio — Zuno vs Monochrome

## Conclusão: **Sim, é semelhante**

A lógica do **Artist Radio** no Zuno segue o mesmo fluxo do Monochrome: buscar artista → juntar álbuns (e EPs no Monochrome) → buscar faixas de cada em chunks → deduplicar → embaralhar → definir fila e tocar.

---

## 1. Página do Artista — Botão "Radio"

| Aspecto | Monochrome | Zuno |
|--------|------------|------|
| **Onde** | Botão "Radio" no header do artista | Botão "Radio" ao lado de Play e Seguir |
| **Entrada** | `artistId` da URL | `artistId` da página + `artist` e `albums` já carregados |
| **Fontes de faixas** | `artist.albums` + `artist.eps` | `albums` (lista única do `getArtist`) |
| **Chunk size** | 3 | 3 (`CHUNK_SIZE`) |
| **Busca de faixas** | `api.getAlbum(album.id)` por chunk, em paralelo | Igual: `api.getAlbum(album.id)` por chunk |
| **Deduplicação** | `Set` por `track.id` | `Set<string>` por `track.id` |
| **Embaralhar** | Fisher-Yates no array | Fisher-Yates (`shuffleArray`) |
| **Tocar** | `player.setQueue(allTracks, 0)` + `playTrackFromQueue()` | `playTrack(shuffled[0], shuffled)` |
| **Loading** | Botão desabilitado + spinner + "Loading..." | `radioLoading` + ícone pulsando + "Carregando..." |
| **Erro** | `alert(...)` | `toast.show(..., 'info' | 'error')` |

**Diferença relevante:** no Monochrome o artista retorna `albums` e `eps` separados e o Radio usa os dois. No Zuno o `getArtist` devolve uma única lista `albums` (montada por um scan genérico no conteúdo que coloca qualquer item com `numberOfTracks` no mesmo mapa). Ou seja: no Zuno, EPs que venham nesse feed já entram no Radio; só não há uma lista separada “EPs” como no Monochrome.

---

## 2. Radio a partir da faixa atual (barra / player)

| Aspecto | Monochrome | Zuno |
|--------|------------|------|
| **Botão na barra** | "Track Mix" — só aparece se `track.mixes.TRACK_MIX` existir; abre a **página do Mix** | "Radio" — sempre visível; inicia **Artist Radio** pelo artista da faixa |
| **Comportamento** | Navega para `/mix/{id}` (Mix Tidal) | Obtém artista (por `track.artistId` ou `searchArtists(track.artist)`), depois mesma lógica do Artist Radio |

No Monochrome, o botão da faixa atual é **Mix** (página de mix Tidal). No Zuno é **Radio** (Artist Radio). A **lógica do Radio em si** (artista → álbuns → faixas → shuffle → play) é a mesma; só o gatilho e o nome do botão mudam (Mix vs Radio).

---

## 3. Resumo

- **Artist Radio (página do artista):** Zuno e Monochrome são **equivalentes** (chunks de 3, dedupe por id, Fisher-Yates, setQueue/play).
- **Radio a partir da faixa:** no Zuno não há Mix por `TRACK_MIX`; em vez disso há “Radio por artista da faixa”, que usa a **mesma lógica** de Radio do Monochrome (só que disparada pela faixa atual).
- **EPs:** Monochrome usa `albums` + `eps` explicitamente; Zuno usa uma única lista `albums` que já pode incluir EPs vindos do feed do artista.

Para alinhar ainda mais ao Monochrome seria possível, no futuro, usar `track.mixes.TRACK_MIX` para um botão “Mix” que abre a página do Mix, e manter o “Radio” como está (Artist Radio).
