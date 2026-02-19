# Plano: Função Mix / Radio (referência Monochrome)

Este documento descreve como implementar no Zuno a função **Mix/Radio** da faixa atual e a **página de Mix**, usando o projeto **Monochrome** (`C:\Users\Admin\Desktop\monochrome`) como referência.

---

## 1. Como funciona no Monochrome

### 1.1 Dois conceitos

| Conceito | Onde aparece | Comportamento |
|----------|---------------|---------------|
| **Track Mix** | Barra “now playing” + menu de contexto da faixa | Botão só aparece se a faixa tiver `track.mixes.TRACK_MIX` (ID de um Mix Tidal). Ao clicar: **navega** para `/mix/{id}`. |
| **Página Mix** | Rota `/mix/:id` | Carrega o mix via `api.getMix(mixId)`, exibe capa, título, subtítulo, lista de faixas, botão Play (define fila e toca), Download e Like. |

### 1.2 Fluxo da faixa atual (now playing)

- **player.js**: ao atualizar a faixa atual, mostra/esconde o botão Mix:
  - `mixBtn.style.display = track.mixes && track.mixes.TRACK_MIX ? 'flex' : 'none'`
- **events.js**: clique no botão → `handleTrackAction('track-mix', currentTrack)` → `navigate('/mix/' + item.mixes.TRACK_MIX)`
- O usuário vai para a **página do Mix** e lá pode dar Play no mix.

### 1.3 Fluxo da página Mix

- **router.js**: rota `mix` → `ui.renderMixPage(id, provider)`.
- **ui.js** `renderMixPage(mixId)`:
  1. Chama `api.getMix(mixId)` → `{ mix, tracks }`.
  2. Preenche capa, título, subtítulo, meta (ex.: “N tracks • duration”), lista de faixas.
  3. Botão Play: `player.setQueue(tracks, 0); player.playTrackFromQueue()`.
  4. Botão Download: baixa o mix como ZIP.
  5. Botão Like: favorita o mix (IndexedDB `favorites_mixes`).

### 1.4 Origem de `mixes` nas faixas

- O objeto **bruto** da API Tidal (track) pode trazer `mixes` (ex.: `{ TRACK_MIX: "uuid" }`).
- No Monochrome, `prepareTrack` não remove campos; o track normalizado mantém `mixes` se a API enviar.
- Em Zuno, `mapApiTrackToTrack` hoje **não** repassa `mixes`; é preciso incluir no plano.

### 1.5 Artist Mix (opcional)

- Na página do artista, se `artist.mixes?.ARTIST_MIX` existir, um botão “Mix” navega para `/mix/${artist.mixes.ARTIST_MIX}`.
- Mesma página Mix; só muda a origem do ID (artista em vez da faixa).

---

## 2. Estado atual no Zuno

- **API**: `api.getMix(mixId)` já existe e retorna `{ mix, tracks }` (em `services/api.ts`).
- **Tipos**: `Track` não tem `mixes`; não existe tipo `Mix` nem view `mix`.
- **Navegação**: não há rota/página para Mix; `View` não inclui `'mix'`.
- **Player**: já existe “Radio a partir da faixa” (Artist Radio por artista da faixa), sem usar Mix.

---

## 3. Plano de implementação no Zuno

### Fase 1 — Tipos e API

1. **types.ts**
   - Adicionar em `Track` (opcional):
     ```ts
     mixes?: { TRACK_MIX?: string };
     ```
   - Adicionar tipo para o mix (ex. para exibição e like):
     ```ts
     export interface Mix {
       id: string;
       title: string;
       subTitle?: string;
       description?: string;
       mixType?: string;
       cover?: string;
     }
     ```
   - Incluir `'mix'` em `View` e, se for guardar mixId na navegação, garantir que `viewId` ou outro estado guarde o `mixId`.

2. **services/api.ts**
   - Em `mapApiTrackToTrack`: se `item.mixes` existir, copiar para o `Track`:
     ```ts
     mixes: item.mixes?.TRACK_MIX ? { TRACK_MIX: item.mixes.TRACK_MIX } : undefined,
     ```
   - Garantir que `getMix` continue retornando `{ mix, tracks }` com `tracks` no formato `Track[]` (já usa `mapApiTrackToTrack` nos items).

### Fase 2 — Página Mix

3. **Nova página: pages/Mix.tsx**
   - Props: `mixId: string`, `onBack: () => void` (e, se precisar, `onNavigate` para artista/álbum).
   - Estado: `mix`, `tracks`, `loading`, opcionalmente `isLiked` se for ter like de mix.
   - `useEffect(mixId)`: chamar `api.getMix(mixId)` (ou `ZunoAPI.getMix`), preencher `mix` e `tracks`.
   - Layout (espelhando Monochrome):
     - Botão voltar (seta).
     - Hero: capa (ou capa da primeira faixa), título do mix, `subTitle`, meta (ex.: “N faixas • duração total”).
     - Botões: **Play** (define fila com `tracks` e toca a primeira), **Download** (ZIP do mix, reutilizar lógica de playlist/álbum se houver), opcional **Like** (se implementar favoritos de mix).
     - Lista de faixas: clique na faixa → `playTrack(track, tracks)`.
   - Tratar loading e erro (ex.: “Mix não encontrado”).

4. **App.tsx**
   - Em `renderView()`: caso `currentView === 'mix'` e `viewId` seja o mixId, renderizar:
     ```tsx
     <MixPage mixId={viewId} onBack={() => setCurrentView('home')} />
     ```
   - Garantir que, ao navegar para mix, `setCurrentView('mix')` e `setViewId(mixId)` sejam chamados.

### Fase 3 — Botão “Mix/Radio” na faixa atual (como Monochrome)

5. **PlayerContext**
   - Manter `startRadioFromTrack` atual (Artist Radio quando não há mix).
   - Adicionar lógica no mesmo handler (ou em um novo “Start Mix”) que:
     - Se `track.mixes?.TRACK_MIX` existir:
       - **Opção A (igual Monochrome)**: navegar para a página Mix com esse ID (precisa de `onNavigateToMix(mixId)` ou equivalente vindo do App).
       - **Opção B**: chamar `api.getMix(track.mixes.TRACK_MIX)`, definir fila com `tracks` e tocar a primeira (sem abrir página).
   - Para **Opção A**: o contexto precisa de um callback de navegação (ex. `navigateToMix: (id: string) => void`) injetado pelo App, ou então o botão “Mix” pode viver na PlayerBar/FullScreenPlayer e receber `onNavigate` para chamar `onNavigate('mix', mixId)`.

6. **PlayerBar e FullScreenPlayer**
   - Botão “Radio” atual: manter como está (sempre visível, chama Artist Radio).
   - **Novo botão “Mix”** (ou unificar comportamento):
     - Se `currentTrack?.mixes?.TRACK_MIX` existir: mostrar botão “Mix” que navega para `/mix` com esse ID (ou chama `getMix` e toca).
     - Caso contrário: o botão “Radio” continua fazendo Artist Radio (já implementado).
   - Assim o fluxo fica alinhado ao Monochrome: quando a API devolver `TRACK_MIX`, o usuário pode abrir o Mix; quando não, cai no Radio por artista.

### Fase 4 — (Opcional) Artist Mix e favoritos de Mix

7. **Página Artista**
   - Se a API do artista no Zuno passar a devolver `mixes.ARTIST_MIX` (depende do backend):
     - Mostrar botão “Mix” ao lado de “Radio” que chama `onNavigate('mix', artist.mixes.ARTIST_MIX)`.

8. **Favoritos de Mix (opcional)**
   - Se quiser “Álbuns curtidos” / “Mixes curtidos”: criar store (IndexedDB ou localStorage) para mixes favoritos e, na página Mix, botão Like que salva/remove o mix nesse store (análogo ao Monochrome com `favorites_mixes`).

---

## 4. Ordem sugerida de tarefas

| # | Tarefa | Arquivos |
|---|--------|----------|
| 1 | Tipos `mixes` em Track, tipo `Mix`, View `'mix'` | `types.ts` |
| 2 | Preservar `mixes` em `mapApiTrackToTrack` | `services/api.ts` |
| 3 | Criar página Mix (Play, lista, Download, loading/erro) | `pages/Mix.tsx` (novo) |
| 4 | Rota e navegação para Mix no App | `App.tsx` |
| 5 | Botão Mix na barra/player: se `TRACK_MIX` → navegar para Mix (ou tocar mix); senão manter Radio | `PlayerContext.tsx`, `PlayerBar.tsx`, `FullScreenPlayer.tsx` |
| 6 | (Opcional) Botão “Mix” na página do artista se houver `ARTIST_MIX` | `pages/Artist.tsx` |
| 7 | (Opcional) Favoritos de Mix | `services/likedMixesService.ts`, `Library.tsx`, etc. |

---

## 5. Referências no Monochrome

- **Botão now-playing Mix**: `js/player.js` (linhas ~188–191, ~379–382); `js/events.js` (~1788–1798); `index.html` (botão `#now-playing-mix-btn`).
- **Ação track-mix**: `js/events.js` (~779–783, ~943–946).
- **Página Mix**: `js/ui.js` `renderMixPage` (~2773–2865); rota em `js/router.js` (~69–72).
- **API getMix**: `js/api.js` (~642–673).
- **Artist Mix**: `js/ui.js` (~2203–2207, ~2900–2907).

Com este plano, a função Mix/Radio no Zuno fica alinhada ao Monochrome: Mix quando a API fornecer `TRACK_MIX`, e Radio por artista como fallback já existente.
