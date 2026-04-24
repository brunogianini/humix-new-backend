# Recomendações — Guia de Implementação Frontend

## Endpoint

```
GET /api/v1/recommendations
```

**Autenticação:** obrigatória — `Authorization: Bearer <access_token>`

---

## Query Params

| Param   | Tipo   | Padrão | Máximo | Descrição                   |
|---------|--------|--------|--------|-----------------------------|
| `limit` | number | `10`   | `50`   | Quantidade de recomendações |

---

## Como funciona

O endpoint retorna uma lista mesclada de dois tipos de álbuns:

- **`"database"`** — álbuns já catalogados no Humix que o usuário ainda não interagiu
- **`"spotify"`** — álbuns que **nenhum usuário adicionou ainda**, buscados diretamente do Spotify

A lógica de recomendação analisa as avaliações do usuário para:
1. Calcular o peso de cada gênero (soma das notas dos álbuns avaliados naquele gênero)
2. Identificar os artistas com maior nota máxima
3. Buscar álbuns compatíveis no banco e no Spotify (top 3 gêneros + top 3 artistas)
4. Para cada resultado, apontar qual álbum do usuário mais influenciou a recomendação

A lista final vem ordenada por `score` (mais relevante primeiro).

---

## Tipo da resposta

```ts
type RecommendationSource = 'database' | 'spotify'

type Recommendation = {
  source: RecommendationSource

  album: {
    title: string
    coverUrl: string | null
    releaseYear: number | null
    artist: {
      name: string
      // presentes quando source === 'database'
      id?: string
      slug?: string
      imageUrl?: string | null
      // presente quando source === 'spotify'
      spotifyId?: string
    }
    genres: { name: string; slug?: string }[]
    avgRating: number    // 0 quando source === 'spotify' (ainda não tem reviews)
    reviewCount: number  // 0 quando source === 'spotify'
    // presentes quando source === 'database'
    id?: string
    slug?: string
    // presente quando source === 'spotify' (ou database com Spotify vinculado)
    spotifyId?: string
  }

  score: number // relevância relativa — lista já vem ordenada

  influencedBy: {
    album: {
      id: string
      title: string
      slug: string
      coverUrl: string | null
      releaseYear: number | null
      artist: { name: string; slug: string }
    }
    rating: number          // nota que o usuário deu a esse álbum (0.5–5.0)
    matchingGenres: string[] // gêneros em comum; vazio quando a afinidade é só por artista
  }
}

type Response = {
  recommendations: Recommendation[]
}
```

---

## Exemplo de resposta

```json
{
  "recommendations": [
    {
      "source": "database",
      "album": {
        "id": "clx1...",
        "slug": "in-rainbows",
        "title": "In Rainbows",
        "coverUrl": "https://...",
        "releaseYear": 2007,
        "artist": {
          "id": "clx0...",
          "name": "Radiohead",
          "slug": "radiohead",
          "imageUrl": "https://..."
        },
        "genres": [
          { "id": "clg1...", "name": "Art Rock", "slug": "art-rock" },
          { "id": "clg2...", "name": "Alternative Rock", "slug": "alternative-rock" }
        ],
        "avgRating": 4.8,
        "reviewCount": 12
      },
      "score": 18.5,
      "influencedBy": {
        "album": {
          "id": "clx2...",
          "title": "OK Computer",
          "slug": "ok-computer",
          "coverUrl": "https://...",
          "releaseYear": 1997,
          "artist": { "name": "Radiohead", "slug": "radiohead" }
        },
        "rating": 5.0,
        "matchingGenres": ["Art Rock", "Alternative Rock"]
      }
    },
    {
      "source": "spotify",
      "album": {
        "spotifyId": "7dGJo4pcD2V6oG8kP0tJRR",
        "title": "The Bends",
        "coverUrl": "https://i.scdn.co/image/...",
        "releaseYear": 1995,
        "artist": {
          "name": "Radiohead",
          "spotifyId": "4Z8W4fKeB5YxbusRsdQVPb"
        },
        "genres": [],
        "avgRating": 0,
        "reviewCount": 0
      },
      "score": 10.0,
      "influencedBy": {
        "album": {
          "id": "clx2...",
          "title": "OK Computer",
          "slug": "ok-computer",
          "coverUrl": "https://...",
          "releaseYear": 1997,
          "artist": { "name": "Radiohead", "slug": "radiohead" }
        },
        "rating": 5.0,
        "matchingGenres": []
      }
    }
  ]
}
```

---

## Diferenças entre `source === 'database'` e `source === 'spotify'`

| Campo                   | `database`                      | `spotify`                                   |
|-------------------------|---------------------------------|---------------------------------------------|
| `album.id`              | ✅ presente                     | ❌ ausente                                  |
| `album.slug`            | ✅ presente (para navegação)    | ❌ ausente                                  |
| `album.spotifyId`       | pode estar presente ou não      | ✅ sempre presente                          |
| `album.genres`          | ✅ com id, name, slug           | `[]` (Spotify não retorna gênero por álbum) |
| `album.avgRating`       | ✅ média real das reviews       | `0` (ainda não importado)                   |
| `album.reviewCount`     | ✅ contagem real                | `0`                                         |
| `album.artist.slug`     | ✅ presente                     | ❌ ausente                                  |
| `album.artist.spotifyId`| ❌ ausente                      | ✅ presente                                 |
| `influencedBy.matchingGenres` | gêneros em comum ou `[]`  | `[]` (por artista) ou `[genreName]` (por gênero) |

---

## Como importar um álbum do Spotify

Quando `source === 'spotify'`, o álbum ainda não existe no Humix. Para adicioná-lo:

```
POST /api/v1/albums/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "spotifyId": "7dGJo4pcD2V6oG8kP0tJRR"
}
```

Após o import bem-sucedido, o álbum passa a ter `id` e `slug` e pode ser avaliado normalmente.

---

## Renderizando o `influencedBy`

**Caso 1 — gêneros em comum** (`matchingGenres` não vazio):
```
Porque você curtiu OK Computer ★ 5.0
Gêneros em comum: Art Rock, Alternative Rock
```

**Caso 2 — mesmo artista** (`matchingGenres` vazio):
```
Outro álbum de Radiohead que você curtiu (OK Computer ★ 5.0)
```

---

## Casos especiais

| Situação                                        | Resposta                      |
|-------------------------------------------------|-------------------------------|
| Usuário sem nenhuma review                      | `{ "recommendations": [] }`   |
| Spotify indisponível (timeout/erro de API)      | Retorna apenas resultados do banco, sem erro |
| Todos os álbuns já foram interagidos pelo usuário | `{ "recommendations": [] }` |
| Token ausente ou inválido                       | `401 Unauthorized`            |

---

## Exemplo de chamada (fetch)

```ts
async function getRecommendations(token: string, limit = 10): Promise<Recommendation[]> {
  const res = await fetch(`/api/v1/recommendations?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Falha ao buscar recomendações')
  const data = await res.json() as { recommendations: Recommendation[] }
  return data.recommendations
}
```

---

## Usando o `score` para exibir relevância relativa

O `score` não tem escala fixa — serve apenas para ordenação. Para exibir uma barra de afinidade:

```ts
const maxScore = recommendations[0]?.score ?? 1
const percent = Math.round((rec.score / maxScore) * 100)
// → "87% de afinidade"
```
