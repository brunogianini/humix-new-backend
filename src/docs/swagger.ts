import { OpenAPIV3 } from 'openapi-types';

const bearerAuth: OpenAPIV3.SecuritySchemeObject = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
};

const paginationParams: OpenAPIV3.ParameterObject[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
];

const errorResponse = (description: string): OpenAPIV3.ResponseObject => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Humix API',
    description: 'Album management platform — like Letterboxd for music.',
    version: '1.0.0',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  components: {
    securitySchemes: { bearerAuth },
    schemas: {
      // ── Auth ──────────────────────────────────────────────────────────────
      RegisterInput: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 30, example: 'johndoe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', minLength: 8, example: 'secret123' },
          displayName: { type: 'string', maxLength: 50, example: 'John Doe' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', example: 'secret123' },
        },
      },
      RefreshTokenInput: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGci...' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      // ── User ─────────────────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          displayName: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      UpdateProfileInput: {
        type: 'object',
        properties: {
          displayName: { type: 'string', maxLength: 50 },
          bio: { type: 'string', maxLength: 500 },
          avatarUrl: { type: 'string', format: 'uri' },
        },
      },
      // ── Artist ───────────────────────────────────────────────────────────
      Artist: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          bio: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          country: { type: 'string', nullable: true },
          formedYear: { type: 'integer', nullable: true },
          dissolvedYear: { type: 'integer', nullable: true },
          genres: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } },
        },
      },
      CreateArtistInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 200, example: 'Radiohead' },
          bio: { type: 'string', maxLength: 2000, example: 'English rock band formed in 1985.' },
          imageUrl: { type: 'string', format: 'uri' },
          country: { type: 'string', maxLength: 100, example: 'UK' },
          formedYear: { type: 'integer', example: 1985 },
          dissolvedYear: { type: 'integer', nullable: true },
          genreIds: { type: 'array', items: { type: 'string' }, example: [] },
        },
      },
      // ── Album ────────────────────────────────────────────────────────────
      Album: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          slug: { type: 'string' },
          releaseYear: { type: 'integer', nullable: true },
          releaseDate: { type: 'string', format: 'date-time', nullable: true },
          coverUrl: { type: 'string', nullable: true },
          totalTracks: { type: 'integer', nullable: true },
          description: { type: 'string', nullable: true },
          artist: { $ref: '#/components/schemas/Artist' },
          genres: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } },
          averageRating: { type: 'number', nullable: true },
          reviewCount: { type: 'integer' },
        },
      },
      CreateAlbumInput: {
        type: 'object',
        required: ['title', 'artistId'],
        properties: {
          title: { type: 'string', maxLength: 200, example: 'OK Computer' },
          artistId: { type: 'string', example: 'cuid...' },
          releaseYear: { type: 'integer', example: 1997 },
          releaseDate: { type: 'string', format: 'date-time' },
          coverUrl: { type: 'string', format: 'uri' },
          totalTracks: { type: 'integer', example: 12 },
          description: { type: 'string', maxLength: 2000 },
          genreIds: { type: 'array', items: { type: 'string' } },
          tracks: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'number'],
              properties: {
                title: { type: 'string' },
                number: { type: 'integer' },
                duration: { type: 'integer', description: 'Duration in seconds' },
              },
            },
          },
        },
      },
      UserAlbumInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['WANT_TO_LISTEN', 'LISTENING', 'LISTENED'] },
        },
      },
      // ── Review ───────────────────────────────────────────────────────────
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rating: { type: 'number', minimum: 0.5, maximum: 5 },
          content: { type: 'string', nullable: true },
          listenedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' },
          album: { $ref: '#/components/schemas/Album' },
        },
      },
      CreateReviewInput: {
        type: 'object',
        required: ['albumId', 'rating'],
        properties: {
          albumId: { type: 'string', example: 'cuid...' },
          rating: { type: 'number', minimum: 0.5, maximum: 5, multipleOf: 0.5, example: 4.5 },
          content: { type: 'string', maxLength: 5000, example: 'Masterpiece.' },
          listenedAt: { type: 'string', format: 'date-time' },
        },
      },
      UpdateReviewInput: {
        type: 'object',
        properties: {
          rating: { type: 'number', minimum: 0.5, maximum: 5, multipleOf: 0.5 },
          content: { type: 'string', maxLength: 5000 },
          listenedAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Generic ──────────────────────────────────────────────────────────
      PaginatedMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },

  paths: {
    // ════════════════════════════════════════════════════════════════════════
    // AUTH
    // ════════════════════════════════════════════════════════════════════════
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
        },
        responses: {
          201: {
            description: 'Registered successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } },
          },
          409: errorResponse('Username or email already taken'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: {
            description: 'Logged in',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } },
          },
          401: errorResponse('Invalid credentials'),
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenInput' } } },
        },
        responses: {
          200: {
            description: 'New tokens',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } },
          },
          401: errorResponse('Invalid refresh token'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: errorResponse('Unauthorized'),
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // USERS
    // ════════════════════════════════════════════════════════════════════════
    '/users/{username}': {
      get: {
        tags: ['Users'],
        summary: 'Get user profile',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          404: errorResponse('User not found'),
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete account',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' }, description: 'User ID' }],
        responses: {
          204: { description: 'Account deleted' },
          403: errorResponse('Forbidden'),
        },
      },
    },
    '/users/me/profile': {
      patch: {
        tags: ['Users'],
        summary: 'Update own profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileInput' } } },
        },
        responses: {
          200: { description: 'Updated profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/users/{username}/albums': {
      get: {
        tags: ['Users'],
        summary: "List user's albums",
        parameters: [
          { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
          ...paginationParams,
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['WANT_TO_LISTEN', 'LISTENING', 'LISTENED'] } },
        ],
        responses: { 200: { description: 'Paginated list of user albums' } },
      },
    },
    '/users/{username}/reviews': {
      get: {
        tags: ['Users'],
        summary: "List user's reviews",
        parameters: [
          { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
          ...paginationParams,
        ],
        responses: { 200: { description: 'Paginated list of reviews' } },
      },
    },
    '/users/{username}/followers': {
      get: {
        tags: ['Users'],
        summary: 'List followers',
        parameters: [
          { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
          ...paginationParams,
        ],
        responses: { 200: { description: 'Paginated list of followers' } },
      },
    },
    '/users/{username}/following': {
      get: {
        tags: ['Users'],
        summary: 'List following',
        parameters: [
          { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
          ...paginationParams,
        ],
        responses: { 200: { description: 'Paginated list of following' } },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // FOLLOWS & FEED
    // ════════════════════════════════════════════════════════════════════════
    '/users/{username}/follow': {
      post: {
        tags: ['Follows'],
        summary: 'Follow a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Followed' },
          409: errorResponse('Already following'),
        },
      },
      delete: {
        tags: ['Follows'],
        summary: 'Unfollow a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Unfollowed' } },
      },
    },
    '/users/feed': {
      get: {
        tags: ['Follows'],
        summary: 'Activity feed from followed users',
        security: [{ bearerAuth: [] }],
        parameters: paginationParams,
        responses: { 200: { description: 'Paginated activity feed' } },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // ARTISTS
    // ════════════════════════════════════════════════════════════════════════
    '/artists': {
      get: {
        tags: ['Artists'],
        summary: 'List artists',
        parameters: [
          ...paginationParams,
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'genre', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Paginated list of artists',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Artist' } },
                    meta: { $ref: '#/components/schemas/PaginatedMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Artists'],
        summary: 'Create artist',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateArtistInput' } } },
        },
        responses: {
          201: { description: 'Created artist', content: { 'application/json': { schema: { $ref: '#/components/schemas/Artist' } } } },
          409: errorResponse('Artist already exists'),
        },
      },
    },
    '/artists/{slug}': {
      get: {
        tags: ['Artists'],
        summary: 'Get artist by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'radiohead' }],
        responses: {
          200: { description: 'Artist', content: { 'application/json': { schema: { $ref: '#/components/schemas/Artist' } } } },
          404: errorResponse('Not found'),
        },
      },
      patch: {
        tags: ['Artists'],
        summary: 'Update artist',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateArtistInput' } } },
        },
        responses: {
          200: { description: 'Updated artist', content: { 'application/json': { schema: { $ref: '#/components/schemas/Artist' } } } },
        },
      },
      delete: {
        tags: ['Artists'],
        summary: 'Delete artist',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // ALBUMS
    // ════════════════════════════════════════════════════════════════════════
    '/albums': {
      get: {
        tags: ['Albums'],
        summary: 'List albums',
        parameters: [
          ...paginationParams,
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'genre', in: 'query', schema: { type: 'string' } },
          { name: 'artistId', in: 'query', schema: { type: 'string' } },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['title', 'releaseYear', 'rating', 'createdAt'], default: 'createdAt' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: {
            description: 'Paginated list of albums',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Album' } },
                    meta: { $ref: '#/components/schemas/PaginatedMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Albums'],
        summary: 'Add album by title + artist (searches Spotify automatically)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'artist'],
                properties: {
                  title: { type: 'string', example: 'OK Computer' },
                  artist: { type: 'string', example: 'Radiohead' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Album imported and created from Spotify', content: { 'application/json': { schema: { $ref: '#/components/schemas/Album' } } } },
          200: { description: 'Album already existed, returned existing record' },
          404: { description: 'No album found on Spotify for the given title/artist' },
        },
      },
    },
    '/albums/{slug}': {
      get: {
        tags: ['Albums'],
        summary: 'Get album by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'ok-computer' }],
        responses: {
          200: { description: 'Album', content: { 'application/json': { schema: { $ref: '#/components/schemas/Album' } } } },
          404: errorResponse('Not found'),
        },
      },
      patch: {
        tags: ['Albums'],
        summary: 'Update album',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAlbumInput' } } },
        },
        responses: { 200: { description: 'Updated album', content: { 'application/json': { schema: { $ref: '#/components/schemas/Album' } } } } },
      },
      delete: {
        tags: ['Albums'],
        summary: 'Delete album',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/albums/user/{albumId}': {
      put: {
        tags: ['Albums'],
        summary: 'Set user–album status (WANT_TO_LISTEN / LISTENING / LISTENED)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'albumId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserAlbumInput' } } },
        },
        responses: { 200: { description: 'Status updated' } },
      },
      delete: {
        tags: ['Albums'],
        summary: 'Remove user–album status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'albumId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Removed' } },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // REVIEWS
    // ════════════════════════════════════════════════════════════════════════
    '/reviews/albums/{albumSlug}/reviews': {
      get: {
        tags: ['Reviews'],
        summary: 'List reviews for an album',
        parameters: [
          { name: 'albumSlug', in: 'path', required: true, schema: { type: 'string' }, example: 'ok-computer' },
          ...paginationParams,
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['createdAt', 'rating'], default: 'createdAt' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: {
            description: 'Paginated reviews',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
                    meta: { $ref: '#/components/schemas/PaginatedMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Create a review',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateReviewInput' } } },
        },
        responses: {
          201: { description: 'Created review', content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } },
          409: errorResponse('Already reviewed this album'),
        },
      },
    },
    '/reviews/{reviewId}': {
      patch: {
        tags: ['Reviews'],
        summary: 'Update a review',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateReviewInput' } } },
        },
        responses: { 200: { description: 'Updated review', content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } } },
      },
      delete: {
        tags: ['Reviews'],
        summary: 'Delete a review',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // STATS
    // ════════════════════════════════════════════════════════════════════════
    '/stats/artists': {
      get: {
        tags: ['Stats'],
        summary: 'Top artists by review count',
        parameters: paginationParams,
        responses: { 200: { description: 'Ranked artists' } },
      },
    },
    '/stats/albums': {
      get: {
        tags: ['Stats'],
        summary: 'Top albums by average rating',
        parameters: paginationParams,
        responses: { 200: { description: 'Ranked albums' } },
      },
    },
    '/stats/genres': {
      get: {
        tags: ['Stats'],
        summary: 'Top genres',
        parameters: paginationParams,
        responses: { 200: { description: 'Ranked genres' } },
      },
    },
    '/stats/users/{username}': {
      get: {
        tags: ['Stats'],
        summary: 'Stats for a specific user',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User stats' } },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // SPOTIFY
    // ════════════════════════════════════════════════════════════════════════
    '/spotify/search': {
      get: {
        tags: ['Spotify'],
        summary: 'Search albums on Spotify',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'ok computer' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 20 } },
        ],
        responses: {
          200: {
            description: 'Search results with alreadyImported flag',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          spotifyId: { type: 'string' },
                          title: { type: 'string' },
                          albumType: { type: 'string' },
                          artist: { type: 'object', properties: { spotifyId: { type: 'string' }, name: { type: 'string' } } },
                          releaseYear: { type: 'integer', nullable: true },
                          coverUrl: { type: 'string', nullable: true },
                          totalTracks: { type: 'integer' },
                          alreadyImported: { type: 'boolean' },
                          importedSlug: { type: 'string', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/albums/import': {
      post: {
        tags: ['Albums'],
        summary: 'Import album from Spotify (auto-creates artist and genres)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['spotifyId'],
                properties: {
                  spotifyId: { type: 'string', example: '6dVIqQ8qmQ5GBnJ9shOYGE' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Album imported successfully' },
          200: { description: 'Album was already imported, returned existing record' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // STREAKS
    // ════════════════════════════════════════════════════════════════════════
    '/streaks/{username}': {
      get: {
        tags: ['Streaks'],
        summary: 'Get listening streaks for a user',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Streak data' } },
      },
    },
    '/streaks': {
      post: {
        tags: ['Streaks'],
        summary: 'Log a listening streak for today',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Streak logged' } },
      },
    },
  },
};
