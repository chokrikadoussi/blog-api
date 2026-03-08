# ADR-001 — Choix de la base de données : PostgreSQL vs MongoDB

**Date** : 2025-01
**Statut** : Accepté

---

## Contexte

Le projet nécessite de stocker des entités fortement relationnelles : articles, auteurs, commentaires imbriqués, tags many-to-many, et likes. Il faut choisir entre une base relationnelle (PostgreSQL) et une base orientée documents (MongoDB).

## Options considérées

### Option A — PostgreSQL
- Base relationnelle mature, requêtes SQL expressives
- Transactions ACID natives
- Contraintes d'intégrité référentielle (FK, UNIQUE, CASCADE)
- Support natif JSON si besoin
- Écosystème Prisma excellent

### Option B — MongoDB
- Flexibilité du schéma (schema-less)
- Documents imbriqués pour les commentaires
- Horizontal scaling natif

## Décision

**PostgreSQL**, pour les raisons suivantes :

1. **Intégrité référentielle** : les relations entre utilisateurs, articles, commentaires et tags sont bien définies. Les FK garantissent la cohérence sans code applicatif supplémentaire.
2. **Commentaires imbriqués** : le `ON DELETE CASCADE` sur `parentId` gère la suppression récursive au niveau DB — ce serait complexe avec MongoDB.
3. **Tags many-to-many** : table pivot `ArticleTags` — naturel en relationnel.
4. **Transactions** : bénéfiques pour les opérations multi-tables (toggle like + comptage).
5. **Prisma** : support PostgreSQL de première classe, typage TypeScript généré automatiquement.

## Conséquences

- Schéma strict à faire évoluer via migrations versionnées (`prisma migrate dev`)
- Prisma génère un client TypeScript typé → 0 erreur de typage sur les requêtes DB
- PostgreSQL disponible via Docker Compose en local, Railway en staging
