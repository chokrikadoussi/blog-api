# Blog API

[![CI](https://github.com/chokrikadoussi/blog-api/actions/workflows/ci.yml/badge.svg)](https://github.com/chokrikadoussi/blog-api/actions/workflows/ci.yml)

API REST pour une plateforme de blog, développée avec Node.js, TypeScript, Express et PostgreSQL.

## Staging

| | |
|---|---|
| **URL** | https://blog-api-production-9c57.up.railway.app |
| **Health check** | https://blog-api-production-9c57.up.railway.app/health |

## Stack

| Couche | Technologie |
|---|---|
| Runtime | Node.js 22 (LTS) |
| Langage | TypeScript strict |
| Framework | Express 5 |
| Base de données | PostgreSQL 16 |
| ORM | Prisma 7 |
| Validation | Zod |
| Auth | JWT + bcrypt |
| Tests | Jest + ts-jest + Supertest |
| CI/CD | GitHub Actions + Railway |

## Lancer le projet en local

### Prérequis

- Node.js 22+
- Docker

### Installation

```bash
npm install
```

### Base de données

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
```

### Démarrage

```bash
npm run dev
```

### Tests

```bash
npm test
npm run test:coverage
```

## Auteur

Chokri Kadoussi
