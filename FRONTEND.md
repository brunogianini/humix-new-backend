# Humix — Plano de Desenvolvimento Frontend

> Referência completa de rotas, tipos, regras de negócio e arquitetura de estado para construção do frontend.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Autenticação e Tokens](#2-autenticação-e-tokens)
3. [Tipos Base](#3-tipos-base)
4. [Rotas da API](#4-rotas-da-api)
   - [Auth](#41-auth)
   - [Users](#42-users)
   - [Albums](#43-albums)
   - [Artists](#44-artists)
   - [Reviews](#45-reviews)
   - [Follows & Feed](#46-follows--feed)
   - [Stats](#47-stats)
   - [Streaks](#48-streaks)
   - [Spotify](#49-spotify)
5. [Respostas de Erro](#5-respostas-de-erro)
6. [Paginação](#6-paginação)
7. [Regras de Negócio](#7-regras-de-negócio)
8. [Arquitetura de Estado Sugerida](#8-arquitetura-de-estado-sugerida)
9. [Páginas Sugeridas](#9-páginas-sugeridas)

---

## 1. Visão Geral

**Base URL:** `http://localhost:3000/api/v1`

**Health check:** `GET http://localhost:3000/health` → `{ status: "ok", timestamp: string }`

**Swagger interativo:** `http://localhost:3000/api-docs`

**Rate limit:** 100 requisições por 15 minutos (global, por IP).

**Headers obrigatórios em rotas autenticadas:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 2. Autenticação e Tokens

O sistema usa dois tokens JWT:

| Token          | Validade padrão | Uso                                      |
|----------------|-----------------|------------------------------------------|
| `accessToken`  | 7 dias          | Enviado em todo request autenticado      |
| `refreshToken` | 30 dias         | Renovar o `accessToken` quando expirar   |

**Fluxo:**
1. Login/registro → guardar ambos os tokens (localStorage ou cookie httpOnly)
2. Requests → `Authorization: Bearer {accessToken}`
3. Quando receber `401 TOKEN_EXPIRED` → chamar `POST /auth/refresh` com o `refreshToken`
4. Se refresh também falhar → redirecionar para login

**Payload decodificado do accessToken:**
```ts
{
  userId: string   // CUID do usuário
  username: string
  iat: number
  exp: number
}
```

---

## 3. Tipos Base

```ts
// ── Enums ──────────────────────────────────────────────────────────────────

type AlbumStatus = 'WANT_TO_LISTEN' | 'LISTENING' | 'LISTENED'
type AlbumType   = 'album' | 'single' | 'compilation'
type SortOrder   = 'asc' | 'desc'

// ── Paginação ──────────────────────────────────────────────────────────────

interface PaginatedMeta {
  total:      number
  page:       number
  limit:      number
  totalPages: number
  hasNext:    boolean
  hasPrev:    boolean
}

interface PaginatedResponse<T> {
  data: T[]
  meta: PaginatedMeta
}

// ── User ───────────────────────────────────────────────────────────────────

interface User {
  id:          string
  username:    string
  displayName: string | null
  bio:         string | null
  avatarUrl:   string | null
  isVerified:  boolean
  createdAt:   string // ISO 8601
}

interface UserProfile extends User {
  _count: {
    reviews:   number
    followers: number
    following: number
  }
  isFollowing?: boolean // presente quando autenticado e vendo outro usuário
}

// ── Genre ──────────────────────────────────────────────────────────────────

interface Genre {
  id:   string
  name: string
  slug: string
}

// ── Artist ─────────────────────────────────────────────────────────────────

interface ArtistSummary {
  id:       string
  name:     string
  slug:     string
  imageUrl: string | null
}

interface Artist extends ArtistSummary {
  bio:          string | null
  country:      string | null
  formedYear:   number | null
  dissolvedYear: number | null
  spotifyId:    string | null
  createdAt:    string
  genres:       Genre[]
  _count: {
    albums: number
  }
}

// Álbum já importado no Humix
interface ArtistAlbumImported extends AlbumSummary {
  inHumix: true
}

// Álbum que existe no Spotify mas ainda não foi importado para o Humix
interface ArtistAlbumUnimported {
  inHumix:     false
  spotifyId:   string
  title:       string
  albumType:   AlbumType
  coverUrl:    string | null
  releaseYear: number | null
  totalTracks: number
}

type ArtistDiscographyEntry = ArtistAlbumImported | ArtistAlbumUnimported

interface ArtistWithDiscography extends Artist {
  albums: ArtistDiscographyEntry[]
}

// ── Track ──────────────────────────────────────────────────────────────────

interface Track {
  id:       string
  title:    string
  number:   number
  duration: number | null // segundos
}

// ── Album ──────────────────────────────────────────────────────────────────

interface AlbumSummary {
  id:          string
  title:       string
  slug:        string
  coverUrl:    string | null
  releaseYear: number | null
  _count: {
    reviews: number
  }
}

interface Album {
  id:          string
  title:       string
  slug:        string
  coverUrl:    string | null
  releaseYear: number | null
  releaseDate: string | null // ISO 8601
  totalTracks: number | null
  description: string | null
  spotifyId:   string | null
  createdAt:   string
  artist:      ArtistSummary
  genres:      Genre[]
  _count: {
    reviews:    number
    userAlbums: number
  }
}

interface AlbumDetail extends Album {
  tracks:     Track[]
  stats: {
    avgRating:   number | null
    reviewCount: number
  }
  userAlbum?:  UserAlbum | null  // só quando autenticado
  userReview?: ReviewSummary | null // só quando autenticado
}

// ── UserAlbum (status da coleção) ──────────────────────────────────────────

interface UserAlbum {
  userId:    string
  albumId:   string
  status:    AlbumStatus
  createdAt: string
  updatedAt: string
}

interface UserAlbumWithAlbum {
  status:    AlbumStatus
  updatedAt: string
  album: {
    id:          string
    title:       string
    slug:        string
    coverUrl:    string | null
    releaseYear: number | null
    artist: {
      name: string
      slug: string
    }
  }
}

// ── Review ─────────────────────────────────────────────────────────────────

interface ReviewSummary {
  id:        string
  rating:    number // 0.5 a 5.0 em incrementos de 0.5
  content:   string | null
  createdAt: string
}

interface Review extends ReviewSummary {
  listenedAt: string | null
  updatedAt:  string
  user: {
    id:          string
    username:    string
    displayName: string | null
    avatarUrl:   string | null
  }
  album: {
    id:       string
    title:    string
    slug:     string
    coverUrl: string | null
    artist: {
      name: string
      slug: string
    }
  }
}

// ── Streak ─────────────────────────────────────────────────────────────────

interface StreakEntry {
  id:      string
  date:    string // ISO date (YYYY-MM-DD)
  albumId: string | null
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalDays:     number
  history:       StreakEntry[]
}

// ── Spotify Search Result ──────────────────────────────────────────────────

interface SpotifySearchResult {
  spotifyId:      string
  title:          string
  albumType:      AlbumType
  artist: {
    spotifyId: string
    name:      string
  }
  releaseYear:    number | null
  coverUrl:       string | null
  totalTracks:    number
  alreadyImported: boolean
  importedSlug:   string | null // slug local se já importado
}

// ── Tokens ─────────────────────────────────────────────────────────────────

interface AuthTokens {
  accessToken:  string
  refreshToken: string
}

interface AuthResponse extends AuthTokens {
  user: {
    id:          string
    username:    string
    email:       string
    displayName: string | null
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────

interface TopArtist extends ArtistSummary {
  genres:      Genre[]
  reviewCount: number
  avgRating:   number
}

interface TopAlbum {
  id:          string
  title:       string
  slug:        string
  coverUrl:    string | null
  releaseYear: number | null
  artist: {
    name: string
    slug: string
  }
  avgRating:   number
  reviewCount: number
}

interface TopGenre extends Genre {
  albumCount: number
}

interface UserStats {
  reviewCount:   number
  avgRating:     number | null
  totalListened: number
  currentStreak: number
  longestStreak: number
  topGenres: Array<Genre & { count: number }>
}
```

---

## 4. Rotas da API

### 4.1 Auth

#### `POST /auth/register`
Cria uma nova conta.

**Body:**
```ts
{
  username:     string  // 3-30 chars, apenas letras, números e _
  email:        string  // email válido
  password:     string  // 8-100 chars
  displayName?: string  // até 50 chars
}
```

**Resposta 201:** `AuthResponse`

**Erros:**
- `409 CONFLICT` — username ou email já cadastrado

---

#### `POST /auth/login`
Autentica um usuário.

**Body:**
```ts
{
  email:    string
  password: string
}
```

**Resposta 200:** `AuthResponse`

**Erros:**
- `401 UNAUTHORIZED` — credenciais inválidas

---

#### `POST /auth/refresh`
Renova o access token.

**Body:**
```ts
{
  refreshToken: string
}
```

**Resposta 200:** `AuthTokens`

**Erros:**
- `401 UNAUTHORIZED` — refresh token inválido ou expirado

---

#### `GET /auth/me` 🔒
Retorna os dados do usuário autenticado no token.

**Resposta 200:**
```ts
{
  userId:   string
  username: string
}
```

---

### 4.2 Users

#### `GET /users/:username`
Retorna o perfil público de um usuário.

**Auth:** Opcional (se autenticado, inclui `isFollowing`)

**Resposta 200:** `UserProfile`

**Erros:**
- `404 NOT_FOUND`

---

#### `PATCH /users/me/profile` 🔒
Atualiza o perfil do usuário autenticado.

**Body:**
```ts
{
  displayName?: string  // até 50 chars
  bio?:         string  // até 500 chars
  avatarUrl?:   string  // URL válida
}
```

**Resposta 200:**
```ts
{
  id:          string
  username:    string
  displayName: string | null
  bio:         string | null
  avatarUrl:   string | null
}
```

---

#### `GET /users/:username/albums`
Lista os álbuns da coleção do usuário.

**Query params:**
```ts
{
  page?:  number  // default: 1
  limit?: number  // default: 20, máx: 100
}
```

**Resposta 200:** `PaginatedResponse<UserAlbumWithAlbum>`

**Erros:**
- `404 NOT_FOUND` — usuário não existe

---

#### `GET /users/:username/reviews`
Lista as reviews do usuário.

**Query params:**
```ts
{
  page?:  number
  limit?: number
}
```

**Resposta 200:** `PaginatedResponse<Review>`

---

#### `GET /users/:username/followers`
Lista os seguidores do usuário.

**Query params:**
```ts
{
  page?:  number
  limit?: number
}
```

**Resposta 200:** `PaginatedResponse<User>`

---

#### `GET /users/:username/following`
Lista quem o usuário segue.

**Query params:**
```ts
{
  page?:  number
  limit?: number
}
```

**Resposta 200:** `PaginatedResponse<User>`

---

#### `DELETE /users/:userId` 🔒
Deleta a própria conta. Apenas o próprio usuário pode deletar.

**Resposta 204:** (sem body)

**Erros:**
- `403 FORBIDDEN` — tentativa de deletar outra conta

---

### 4.3 Albums

#### `GET /albums`
Lista álbuns com filtros e ordenação.

**Query params:**
```ts
{
  page?:     number                                        // default: 1
  limit?:    number                                        // default: 20, máx: 100
  search?:   string                                        // busca no título
  genre?:    string                                        // slug do gênero
  artistId?: string                                        // ID do artista
  year?:     number                                        // ano de lançamento
  sort?:     'title' | 'releaseYear' | 'rating' | 'createdAt'  // default: 'createdAt'
  order?:    'asc' | 'desc'                                // default: 'desc'
}
```

**Resposta 200:** `PaginatedResponse<Album>`

---

#### `GET /albums/:slug`
Retorna um álbum completo com faixas, stats e dados do usuário.

**Auth:** Opcional (se autenticado, inclui `userAlbum` e `userReview`)

**Resposta 200:** `AlbumDetail`

**Erros:**
- `404 NOT_FOUND`

---

#### `POST /albums` 🔒
Adiciona um álbum ao catálogo via busca automática no Spotify.

**Body:**
```ts
{
  title:  string  // nome do álbum
  artist: string  // nome do artista/banda
}
```

**Resposta 201:** `Album & { alreadyExisted: false }` — álbum criado

**Resposta 200:** `Album & { alreadyExisted: true }` — álbum já existia no catálogo

**O que acontece internamente:**
1. Busca no Spotify com `album:{title} artist:{artist}`
2. Pega o primeiro resultado
3. Cria o artista no banco (se não existir), incluindo gêneros e imagem
4. Cria o álbum com todas as faixas

**Erros:**
- `404 NOT_FOUND` — nenhum resultado encontrado no Spotify para esse título/artista

---

#### `POST /albums/import` 🔒
Importa um álbum diretamente pelo ID do Spotify (útil após busca via `/spotify/search`).

**Body:**
```ts
{
  spotifyId: string  // ID do Spotify (ex: "6dVIqQ8qmQ5GBnJ9shOYGE")
}
```

**Resposta 201:** `Album & { alreadyExisted: false }` — álbum criado

**Resposta 200:** `Album & { alreadyExisted: true }` — álbum já existia

---

#### `PATCH /albums/:slug` 🔒
Atualiza campos editáveis de um álbum. Dados do Spotify (faixas, artista, etc.) não são alteráveis aqui.

**Body:**
```ts
{
  description?: string  // até 2000 chars
  coverUrl?:    string  // URL válida
}
```

**Resposta 200:** `Album`

---

#### `DELETE /albums/:slug` 🔒
Remove um álbum do catálogo.

**Resposta 204:** (sem body)

---

#### `PUT /albums/user/:albumId` 🔒
Define ou atualiza o status de um álbum na coleção do usuário.

**Body:**
```ts
{
  status: AlbumStatus  // 'WANT_TO_LISTEN' | 'LISTENING' | 'LISTENED'
}
```

**Resposta 200:** `UserAlbum`

---

#### `DELETE /albums/user/:albumId` 🔒
Remove um álbum da coleção do usuário.

**Resposta 204:** (sem body)

---

### 4.4 Artists

#### `GET /artists`
Lista artistas com filtros.

**Query params:**
```ts
{
  page?:   number
  limit?:  number
  search?: string  // busca no nome
  genre?:  string  // slug do gênero
}
```

**Resposta 200:** `PaginatedResponse<Artist>`

---

#### `GET /artists/:slug`
Retorna artista completo com discografia.

**Resposta 200:** `ArtistWithDiscography`

Se o artista tiver `spotifyId`, o campo `albums` inclui **todos os álbuns do artista no Spotify**, não apenas os importados para o Humix. Cada entrada tem `inHumix: true` (álbum já no catálogo, com `slug` e demais campos) ou `inHumix: false` (só existe no Spotify, com `spotifyId` para importar).

**Fluxo para álbuns não importados (`inHumix: false`):**
1. Exibir o álbum com tag "Adicionar ao Humix"
2. Usuário clica → chamar `POST /albums/import` com o `spotifyId`
3. Álbum é criado e passa a aparecer com `inHumix: true`

> Se o artista não tiver `spotifyId`, ou o Spotify estiver indisponível, retorna apenas os álbuns já cadastrados (todos com `inHumix: true`).

**Erros:**
- `404 NOT_FOUND`

---

#### `POST /artists` 🔒
Cria um artista manualmente (para casos sem Spotify).

**Body:**
```ts
{
  name:          string    // até 200 chars
  bio?:          string    // até 2000 chars
  imageUrl?:     string    // URL válida
  country?:      string    // até 100 chars
  formedYear?:   number    // 1900 até ano atual
  dissolvedYear?: number
  genreIds?:     string[]  // IDs de gêneros existentes
}
```

**Resposta 201:**
```ts
{
  id:         string
  name:       string
  slug:       string
  country:    string | null
  formedYear: number | null
}
```

---

#### `PATCH /artists/:slug` 🔒
Atualiza um artista. Todos os campos são opcionais.

**Body:** mesmo do `POST /artists` (todos opcionais)

**Resposta 200:** `{ id, name, slug }`

---

#### `DELETE /artists/:slug` 🔒
Remove um artista (cascata: remove todos os álbuns associados).

**Resposta 204:** (sem body)

---

### 4.5 Reviews

#### `GET /reviews/albums/:albumSlug/reviews`
Lista as reviews de um álbum.

**Query params:**
```ts
{
  page?:  number
  limit?: number
  sort?:  'createdAt' | 'rating'  // default: 'createdAt'
  order?: 'asc' | 'desc'          // default: 'desc'
}
```

**Resposta 200:** `PaginatedResponse<Review>`

**Erros:**
- `404 NOT_FOUND` — álbum não existe

---

#### `POST /reviews` 🔒
Cria uma review para um álbum. Apenas uma review por usuário por álbum.

**Body:**
```ts
{
  albumId:     string  // CUID do álbum
  rating:      number  // 0.5 a 5.0, múltiplos de 0.5
  content?:    string  // até 5000 chars
  listenedAt?: string  // ISO 8601 datetime
}
```

**Resposta 201:** `Review`

**Efeito colateral:** registra um streak para hoje.

**Erros:**
- `404 NOT_FOUND` — álbum não encontrado
- `409 CONFLICT` — usuário já tem review desse álbum

---

#### `PATCH /reviews/:reviewId` 🔒
Atualiza uma review. Apenas o autor pode editar.

**Body:**
```ts
{
  rating?:     number
  content?:    string
  listenedAt?: string
}
```

**Resposta 200:** `Review`

**Erros:**
- `403 FORBIDDEN` — usuário não é o autor

---

#### `DELETE /reviews/:reviewId` 🔒
Deleta uma review. Apenas o autor pode deletar.

**Resposta 204:** (sem body)

**Erros:**
- `403 FORBIDDEN` — usuário não é o autor

---

### 4.6 Follows & Feed

#### `POST /users/:username/follow` 🔒
Segue um usuário.

**Resposta 201:**
```ts
{
  message: "Followed successfully"
}
```

**Erros:**
- `400 BAD_REQUEST` — tentar seguir a si mesmo
- `404 NOT_FOUND` — usuário não existe
- `409 CONFLICT` — já segue esse usuário

---

#### `DELETE /users/:username/follow` 🔒
Para de seguir um usuário.

**Resposta 204:** (sem body)

**Erros:**
- `404 NOT_FOUND` — relação de follow não existe

---

#### `GET /users/feed` 🔒
Retorna o feed de reviews dos usuários que você segue, em ordem cronológica reversa.

**Query params:**
```ts
{
  page?:  number  // default: 1
  limit?: number  // default: 20, máx: 100
}
```

**Resposta 200:** `PaginatedResponse<Review>`

---

### 4.7 Stats

#### `GET /stats/artists`
Ranking global de artistas por número de reviews.

**Query params:**
```ts
{
  limit?: number  // default: 10, máx: 50
}
```

**Resposta 200:** `TopArtist[]`

---

#### `GET /stats/albums`
Ranking global de álbuns por média de rating.

**Query params:**
```ts
{
  limit?: number
}
```

**Resposta 200:** `TopAlbum[]`

---

#### `GET /stats/genres`
Ranking de gêneros por quantidade de álbuns.

**Query params:**
```ts
{
  limit?: number
}
```

**Resposta 200:** `TopGenre[]`

---

#### `GET /stats/users/:username`
Estatísticas completas de um usuário.

**Resposta 200:** `UserStats`

```ts
// Exemplo de resposta:
{
  reviewCount:   47,
  avgRating:     3.8,
  totalListened: 32,       // álbuns com status LISTENED
  currentStreak: 5,        // dias consecutivos com review (até hoje)
  longestStreak: 14,
  topGenres: [
    { id: "...", name: "Alternative Rock", slug: "alternative-rock", count: 18 },
    { id: "...", name: "Post-Rock", slug: "post-rock", count: 9 }
  ]
}
```

---

### 4.8 Streaks

#### `GET /streaks/:username`
Retorna histórico completo de streaks do usuário.

**Resposta 200:** `StreakData`

**Erros:**
- `404 NOT_FOUND` — usuário não existe

---

#### `POST /streaks` 🔒
Registra um streak para hoje. Idempotente: pode ser chamado múltiplas vezes no mesmo dia sem efeito colateral.

**Body:**
```ts
{
  albumId?: string  // opcional: ID do álbum ouvido
}
```

**Resposta 201:**
```ts
{
  id:        string
  userId:    string
  date:      string  // ISO date
  albumId:   string | null
  createdAt: string
}
```

> **Nota:** A criação de uma review (`POST /reviews`) já registra o streak automaticamente. Esse endpoint é para registrar dias de escuta sem criar uma review.

---

### 4.9 Spotify

#### `GET /spotify/search`
Busca álbuns no Spotify. Não salva nada no banco.

**Query params:**
```ts
{
  q:      string  // obrigatório
  limit?: number  // default: 10, máx: 20
}
```

**Resposta 200:**
```ts
{
  data: SpotifySearchResult[]
}
```

**Erros:**
- `400 VALIDATION_ERROR` — parâmetro `q` ausente

**Fluxo de uso típico:**
1. Usuário digita nome do álbum → `GET /spotify/search?q=ok+computer`
2. Exibe resultados com `alreadyImported: true/false`
3. Se `alreadyImported: true` → redireciona para `/albums/{importedSlug}`
4. Se `alreadyImported: false` → chama `POST /albums/import` com o `spotifyId`

---

## 5. Respostas de Erro

Todos os erros seguem o mesmo formato:

```ts
{
  error: {
    code:     string   // código de erro
    message:  string   // mensagem legível
    details?: object   // detalhes adicionais (ex: erros de validação por campo)
  }
}
```

**Códigos de erro:**

| HTTP | Code                | Situação                                           |
|------|---------------------|----------------------------------------------------|
| 400  | `BAD_REQUEST`       | Requisição inválida (ex: seguir a si mesmo)        |
| 401  | `UNAUTHORIZED`      | Sem token ou credenciais inválidas                 |
| 401  | `TOKEN_EXPIRED`     | Access token expirado → chamar `/auth/refresh`     |
| 401  | `INVALID_TOKEN`     | Token malformado → redirecionar para login         |
| 403  | `FORBIDDEN`         | Sem permissão para a ação                          |
| 404  | `NOT_FOUND`         | Recurso não encontrado                             |
| 409  | `CONFLICT`          | Conflito de dados (ex: email duplicado, já segue)  |
| 422  | `VALIDATION_ERROR`  | Dados inválidos no body/query                      |
| 429  | `RATE_LIMIT`        | Muitas requisições                                 |
| 500  | `INTERNAL_ERROR`    | Erro interno do servidor                           |

**Exemplo de erro de validação (422):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "rating": ["Number must be a multiple of 0.5"],
      "albumId": ["Invalid cuid"]
    }
  }
}
```

---

## 6. Paginação

Todos os endpoints de lista retornam:

```ts
{
  data: T[],
  meta: {
    total:      number   // total de registros no banco com os filtros aplicados
    page:       number   // página atual
    limit:      number   // itens por página
    totalPages: number   // Math.ceil(total / limit)
    hasNext:    boolean  // page < totalPages
    hasPrev:    boolean  // page > 1
  }
}
```

**Params padrão de paginação (query string):**
```
page=1&limit=20
```

---

## 7. Regras de Negócio

### Álbuns
- O usuário só precisa informar `title` + `artist` para adicionar um álbum. O backend busca no Spotify, cria artista/gêneros/faixas automaticamente.
- Se o álbum já existir no banco (`alreadyExisted: true`), retorna `200` em vez de `201`.
- Slug de álbum inclui 6 chars do ID do artista para evitar colisões (ex: `ok-computer-abc123`).
- Deletar um artista remove em cascata todos os seus álbuns, faixas, reviews e entradas de coleção.

### Reviews
- **Um review por usuário por álbum.** Segunda tentativa retorna `409 CONFLICT`.
- Rating aceita valores: `0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0`
- Criar uma review registra automaticamente um streak para hoje.
- Apenas o autor pode editar ou deletar sua review.

### Follows
- Follows são **unidirecionais** (como Twitter, não como amizade).
- Não é possível seguir a si mesmo.
- O feed só mostra reviews de usuários que você segue.

### Streaks
- Um streak por dia por usuário (constraint unique).
- `currentStreak` = dias consecutivos até hoje com ao menos uma review/streak.
- `longestStreak` = maior sequência contínua de dias.
- Criar uma review já dispara o registro do streak; `POST /streaks` é para dias sem review.

### Estatísticas
- Stats de usuário são calculadas sob demanda (não são cached).
- `totalListened` conta apenas álbuns com status `LISTENED` na coleção.
- `topGenres` analisa os gêneros dos álbuns que o usuário revisou.

---

## 8. Arquitetura de Estado Sugerida

### Sessão do usuário
```ts
interface SessionState {
  user: {
    id:          string
    username:    string
    displayName: string | null
    avatarUrl:   string | null
  } | null
  accessToken:  string | null
  refreshToken: string | null
  isAuthenticated: boolean
}
```

### Interceptor HTTP sugerido
```ts
// Pseudo-código para axios/fetch wrapper
async function request(config) {
  try {
    return await fetch(config)
  } catch (err) {
    if (err.status === 401 && err.code === 'TOKEN_EXPIRED') {
      const tokens = await POST('/auth/refresh', { refreshToken })
      saveTokens(tokens)
      return await fetch(config) // retry com novo token
    }
    if (err.status === 401) {
      redirectToLogin()
    }
    throw err
  }
}
```

### Estado de coleção do usuário (álbuns)
```ts
// Map de albumId → status para acesso O(1) no frontend
type CollectionState = Map<string, AlbumStatus>
```

---

## 9. Páginas Sugeridas

| Página               | Rota frontend          | APIs utilizadas                                                     |
|----------------------|------------------------|---------------------------------------------------------------------|
| Home / Descoberta    | `/`                    | `GET /stats/albums`, `GET /stats/artists`, `GET /albums`            |
| Buscar álbum         | `/search`              | `GET /spotify/search`, `POST /albums` ou `POST /albums/import`      |
| Detalhe do álbum     | `/albums/:slug`        | `GET /albums/:slug`, `GET /reviews/albums/:slug/reviews`            |
| Detalhe do artista   | `/artists/:slug`       | `GET /artists/:slug`, `POST /albums/import` (para álbuns não importados) |
| Perfil de usuário    | `/u/:username`         | `GET /users/:username`, `GET /users/:username/reviews`              |
| Minha coleção        | `/u/:username/albums`  | `GET /users/:username/albums`                                       |
| Feed                 | `/feed`                | `GET /users/feed`                                                   |
| Login                | `/login`               | `POST /auth/login`                                                  |
| Registro             | `/register`            | `POST /auth/register`                                               |
| Configurações        | `/settings`            | `PATCH /users/me/profile`                                           |
| Ranking              | `/charts`              | `GET /stats/albums`, `GET /stats/artists`, `GET /stats/genres`      |

---

*Gerado em 2026-03-31 — baseado na análise completa do repositório Humix.*
