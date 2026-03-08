const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Blog API",
    version: "1.0.0",
    description:
      "REST API pour une plateforme de blog. Authentification JWT, RBAC (AUTHOR / MODERATOR / ADMIN), commentaires imbriqués, tags many-to-many, likes toggle.",
    contact: {
      name: "Chokri Kadoussi",
      url: "https://github.com/chokrikadoussi",
    },
  },
  servers: [
    { url: "https://blog-api-production-9c57.up.railway.app", description: "Staging (Railway)" },
    { url: "http://localhost:3000", description: "Local" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string", example: "Message d'erreur" } },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 42 },
          totalPages: { type: "integer", example: 5 },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", example: "alice@example.com" },
          role: { type: "string", enum: ["AUTHOR", "MODERATOR", "ADMIN"], example: "AUTHOR" },
        },
      },
      Article: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          title: { type: "string", example: "Introduction à Prisma" },
          slug: { type: "string", example: "introduction-a-prisma" },
          content: { type: "string", example: "Prisma est un ORM TypeScript..." },
          status: {
            type: "string",
            enum: ["DRAFT", "PUBLISHED", "DELETED"],
            example: "PUBLISHED",
          },
          author: { $ref: "#/components/schemas/User" },
          articleTags: {
            type: "array",
            items: {
              type: "object",
              properties: { tag: { $ref: "#/components/schemas/Tag" } },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "TypeScript" },
          slug: { type: "string", example: "typescript" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          content: { type: "string", example: "Super article !" },
          author: { $ref: "#/components/schemas/User" },
          parentId: { type: "integer", nullable: true, example: null },
          replies: { type: "array", items: { $ref: "#/components/schemas/Comment" } },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  tags: [
    { name: "Auth", description: "Inscription et connexion" },
    { name: "Articles", description: "CRUD articles avec soft delete" },
    { name: "Comments", description: "Commentaires imbriqués" },
    { name: "Tags", description: "Gestion des tags" },
    { name: "Likes", description: "Toggle like sur un article" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Créer un compte",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "alice@example.com" },
                  password: { type: "string", minLength: 8, example: "motdepasse123" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Compte créé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                  },
                },
              },
            },
          },
          400: {
            description: "Données invalides",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          409: {
            description: "Email déjà utilisé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Se connecter",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "alice@example.com" },
                  password: { type: "string", example: "motdepasse123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Connecté",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                  },
                },
              },
            },
          },
          400: {
            description: "Données invalides",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          401: {
            description: "Identifiants incorrects",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/articles": {
      get: {
        tags: ["Articles"],
        summary: "Lister les articles publiés",
        security: [{}],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, maximum: 50 } },
          {
            name: "tag",
            in: "query",
            schema: { type: "string" },
            description: "Filtrer par slug de tag",
            example: "typescript",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Recherche dans le titre/contenu",
          },
          {
            name: "author",
            in: "query",
            schema: { type: "integer" },
            description: "Filtrer par ID d'auteur",
          },
        ],
        responses: {
          200: {
            description: "Liste paginée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Article" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Articles"],
        summary: "Créer un article",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: {
                    type: "string",
                    minLength: 3,
                    maxLength: 200,
                    example: "Introduction à Prisma",
                  },
                  content: { type: "string", example: "Prisma est un ORM TypeScript..." },
                  status: { type: "string", enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    example: ["typescript", "nodejs"],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Article créé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Article" } } },
          },
          400: {
            description: "Données invalides",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/articles/{id}": {
      get: {
        tags: ["Articles"],
        summary: "Lire un article",
        security: [{}],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: {
            description: "Article trouvé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Article" } } },
          },
          404: {
            description: "Article introuvable ou DRAFT non autorisé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      patch: {
        tags: ["Articles"],
        summary: "Modifier un article (propriétaire ou MODERATOR+)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", minLength: 3, maxLength: 200 },
                  content: { type: "string" },
                  status: { type: "string", enum: ["DRAFT", "PUBLISHED"] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Article modifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Article" } } },
          },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          403: {
            description: "Accès interdit",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          404: {
            description: "Article introuvable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      delete: {
        tags: ["Articles"],
        summary: "Soft-delete un article (propriétaire ou MODERATOR+)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          204: { description: "Supprimé (soft delete)" },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          403: {
            description: "Accès interdit",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/articles/{id}/like": {
      post: {
        tags: ["Likes"],
        summary: "Toggle like sur un article",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: {
            description: "Like togglé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    liked: { type: "boolean", example: true },
                    likesCount: { type: "integer", example: 42 },
                  },
                },
              },
            },
          },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          404: {
            description: "Article introuvable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/articles/{id}/tags": {
      post: {
        tags: ["Tags"],
        summary: "Associer des tags à un article (propriétaire ou MODERATOR+)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tags"],
                properties: {
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    example: ["typescript", "nodejs"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tags associés",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Article" } } },
          },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          403: {
            description: "Accès interdit",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/articles/{id}/tags/{tagId}": {
      delete: {
        tags: ["Tags"],
        summary: "Retirer un tag d'un article (propriétaire ou MODERATOR+)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "tagId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          204: { description: "Tag retiré" },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          403: {
            description: "Accès interdit",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/articles/{id}/comments": {
      get: {
        tags: ["Comments"],
        summary: "Lister les commentaires (arbre imbriqué paginé)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: "Arbre de commentaires",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Comment" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          404: {
            description: "Article introuvable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      post: {
        tags: ["Comments"],
        summary: "Ajouter un commentaire",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    minLength: 1,
                    maxLength: 2000,
                    example: "Super article !",
                  },
                  parentId: {
                    type: "integer",
                    nullable: true,
                    example: null,
                    description: "ID du commentaire parent (réponse)",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Commentaire créé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Comment" } } },
          },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          404: {
            description: "Article introuvable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/comments/{id}": {
      delete: {
        tags: ["Comments"],
        summary: "Supprimer un commentaire (propriétaire ou MODERATOR+)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          204: { description: "Supprimé (cascade sur les réponses)" },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          403: {
            description: "Accès interdit",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          404: {
            description: "Commentaire introuvable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/tags": {
      get: {
        tags: ["Tags"],
        summary: "Lister les tags",
        parameters: [
          {
            name: "tag",
            in: "query",
            schema: { type: "string" },
            description: "Recherche par nom (insensible à la casse)",
          },
        ],
        responses: {
          200: {
            description: "Liste des tags",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Tag" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tags"],
        summary: "Créer un tag (MODERATOR+)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 2, maxLength: 50, example: "TypeScript" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Tag créé",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Tag" } } },
          },
          401: {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          403: {
            description: "Rôle insuffisant (MODERATOR+ requis)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          409: {
            description: "Tag déjà existant",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
  },
};

export default openApiSpec;
