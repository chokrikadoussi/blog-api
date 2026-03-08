# Blog API

[![CI](https://github.com/chokrikadoussi/blog-api/actions/workflows/ci.yml/badge.svg)](https://github.com/chokrikadoussi/blog-api/actions/workflows/ci.yml)

REST API complète pour une plateforme de blog — projet de portfolio démontrant une architecture backend professionnelle avec Node.js, TypeScript strict, Prisma, JWT/RBAC, 54 tests d'intégration et CI/CD.

---

## Liens

| | |
|---|---|
| **Staging (Railway)** | https://blog-api-production-9c57.up.railway.app |
| **Health check** | https://blog-api-production-9c57.up.railway.app/health |
| **Swagger UI** | https://blog-api-production-9c57.up.railway.app/api-docs |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Runtime | Node.js 22 (LTS) |
| Langage | TypeScript strict (ES2022, `strict: true`) |
| Framework | Express.js 5 |
| Base de données | PostgreSQL 16 |
| ORM | Prisma 7 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| Tests | Jest + ts-jest + Supertest (54 tests) |
| CI/CD | GitHub Actions + Railway |
| Sécurité | Helmet + express-rate-limit + CORS |
| Logs | Winston |

---

## Prérequis

- **Node.js** ≥ 22
- **Docker** + Docker Compose

---

## Installation locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/chokrikadoussi/blog-api.git
cd blog-api

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (voir section ci-dessous)

# 4. Démarrer PostgreSQL
npm run docker:up

# 5. Appliquer les migrations et générer le client Prisma
npm run db:migrate

# 6. Lancer le serveur en mode développement
npm run dev
```

Le serveur écoute sur `http://localhost:3000`.

---

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète.

| Variable | Description | Valeur par défaut |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL principale | `postgresql://user:pass@localhost:5433/blog_db` |
| `DATABASE_URL_TEST` | URL PostgreSQL pour les tests | `postgresql://user:pass@localhost:5433/blog_db_test` |
| `JWT_SECRET` | Secret JWT (≥ 32 chars en prod) | _(générer avec `openssl rand -base64 32`)_ |
| `JWT_EXPIRES_IN` | Durée de validité du token | `7d` |
| `PORT` | Port du serveur | `3000` |
| `NODE_ENV` | Environnement | `development` |
| `CORS_ORIGIN` | Origines autorisées (CORS) | `http://localhost:3000` |

---

## Commandes disponibles

```bash
npm run dev             # Serveur en mode watch (tsx)
npm run build           # Compilation TypeScript → dist/
npm run start           # Démarrer depuis dist/ (production)
npm test                # Lancer les tests
npm run test:coverage   # Tests + rapport de couverture (seuil : 70%)
npm run test:watch      # Tests en mode watch
npm run lint            # ESLint
npm run format          # Prettier --write
npm run format:check    # Vérifier le formatage (CI)
npm run db:generate     # Générer le client Prisma
npm run db:migrate      # Créer et appliquer une migration (dev)
npm run db:deploy       # Appliquer les migrations (prod/CI)
npm run db:studio       # Ouvrir Prisma Studio
npm run docker:up       # Démarrer PostgreSQL via Docker Compose
npm run docker:down     # Arrêter PostgreSQL
```

---

## Architecture des routes

**Rôles RBAC** : `AUTHOR` < `MODERATOR` < `ADMIN`

| Méthode | Route | Auth requise | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Créer un compte |
| `POST` | `/auth/login` | — | Se connecter, obtenir un JWT |
| `GET` | `/articles` | Optionnelle | Lister les articles publiés (pagination, `?tag=`, `?search=`) |
| `POST` | `/articles` | AUTHOR+ | Créer un article |
| `GET` | `/articles/:id` | Optionnelle | Lire un article (DRAFT visible par l'auteur uniquement) |
| `PATCH` | `/articles/:id` | Propriétaire ou MODERATOR+ | Modifier un article |
| `DELETE` | `/articles/:id` | Propriétaire ou MODERATOR+ | Soft-delete un article |
| `POST` | `/articles/:id/like` | AUTHOR+ | Toggle like |
| `POST` | `/articles/:id/tags` | Propriétaire ou MODERATOR+ | Associer des tags |
| `DELETE` | `/articles/:id/tags/:tagId` | Propriétaire ou MODERATOR+ | Retirer un tag |
| `GET` | `/articles/:id/comments` | — | Lister les commentaires (arbre imbriqué, paginé) |
| `POST` | `/articles/:id/comments` | AUTHOR+ | Ajouter un commentaire (ou réponse) |
| `DELETE` | `/comments/:id` | Propriétaire ou MODERATOR+ | Supprimer un commentaire (cascade) |
| `GET` | `/tags` | — | Lister les tags |
| `POST` | `/tags` | MODERATOR+ | Créer un tag |
| `GET` | `/health` | — | État du serveur + DB |
| `GET` | `/api-docs` | — | Documentation Swagger/OpenAPI interactive |

---

## Architecture du projet

```
src/
├── routes/         → Routes Express + validation Zod
├── services/       → Logique métier pure (testable sans HTTP)
├── middlewares/    → authenticate, authorize, errorHandler, rateLimiter
├── lib/            → Prisma client, Winston logger
├── config/         → Variables d'environnement centralisées
├── docs/           → Spécification OpenAPI
└── utils/          → slugify, classes d'erreurs HTTP
prisma/
├── schema.prisma   → Schéma de base de données
└── migrations/     → Migrations SQL versionnées
tests/
├── integration/    → 54 tests HTTP avec Supertest
├── unit/           → Tests unitaires
└── helpers/        → Factories de données, JWT helpers
docs/
├── adr/            → Architecture Decision Records
└── database.md     → Schéma ER + documentation DB
```

---

## Documentation

- [Schéma de base de données](docs/database.md)
- [ADR-001 — Choix PostgreSQL](docs/adr/001-database-choice.md)
- [ADR-002 — Stratégie JWT](docs/adr/002-auth-strategy.md)
- [ADR-003 — Soft delete](docs/adr/003-soft-delete.md)
- [ADR-004 — Choix Prisma](docs/adr/004-orm-choice.md)

---

## Auteur

**Chokri Kadoussi** — [GitHub](https://github.com/chokrikadoussi)
