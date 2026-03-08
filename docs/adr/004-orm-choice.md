# ADR-004 — Choix de l'ORM : Prisma vs TypeORM vs Knex

**Date** : 2025-01
**Statut** : Accepté

---

## Contexte

Le projet utilise TypeScript strict et PostgreSQL. Il faut choisir un outil pour interagir avec la base de données.

## Options considérées

### Option A — Prisma
- Schéma déclaratif (`schema.prisma`) → migrations auto-générées
- Client TypeScript entièrement typé (types générés depuis le schéma)
- Query builder intuitif, pas de SQL brut nécessaire
- `prisma studio` pour explorer les données en local
- Prisma 7 : client ESM-only, adapters pour différents drivers

### Option B — TypeORM
- Basé sur les décorateurs TypeScript
- Active Record ou Data Mapper pattern
- Typage moins strict que Prisma (repose sur les décorateurs)
- Migrations manuelles ou auto-générées

### Option C — Knex
- Query builder SQL pur, pas d'abstraction ORM
- Contrôle total sur le SQL généré
- Pas de types auto-générés → typage manuel requis
- Idéal pour des requêtes très complexes

## Décision

**Prisma**, pour les raisons suivantes :

1. **Typage bout-en-bout** : le client généré depuis `schema.prisma` garantit que toute requête est correctement typée — 0 `any` sur les accès DB.
2. **Migrations versionnées** : `prisma migrate dev` génère et applique les migrations automatiquement, avec un historique SQL versionné dans `prisma/migrations/`.
3. **DX supérieure** : la syntaxe `prisma.articles.findMany({ where: { status: 'PUBLISHED' }, include: { author: true } })` est lisible et refactorable sans risque.
4. **Écosystème actif** : Prisma est le choix dominant en 2025 pour les projets TypeScript/Node.js.
5. **select vs include** : Prisma permet de contrôler finement les champs retournés (`select`) pour éviter d'exposer des données sensibles (`password_hash`).

## Conséquences

- Le client Prisma est généré dans `src/generated/prisma/` (gitignored) — `prisma generate` requis après `npm install`
- Prisma 7 génère un client ESM-only → compatibilité Jest requiert `--experimental-vm-modules` (voir ADR implicite dans BLG-16)
- `$queryRaw` avec template literals est paramétré nativement par Prisma — pas de risque d'injection SQL
- `$queryRawUnsafe()` à proscrire sauf cas exceptionnel documenté
