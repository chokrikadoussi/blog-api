# ADR-003 — Soft delete pour les articles

**Date** : 2025-01
**Statut** : Accepté

---

## Contexte

Lorsqu'un article est supprimé, doit-on le supprimer physiquement (`DELETE SQL`) ou le marquer comme supprimé tout en le conservant en base ?

## Options considérées

### Option A — Suppression physique (`DELETE SQL`)
- Simple, pas de données "mortes" en base
- Irréversible
- Perte des statistiques (likes, commentaires) associées

### Option B — Soft delete (champ `status = 'DELETED'`)
- Article masqué des listes publiques mais conservé en DB
- Réversible (un admin peut le restaurer)
- Intégrité des données historiques préservée
- Commentaires et likes conservés

## Décision

**Soft delete via `status = 'DELETED'`**, pour les raisons suivantes :

1. **Irréversibilité** : une suppression accidentelle d'un article avec 100 commentaires serait catastrophique avec un DELETE physique.
2. **Audit trail** : en production réelle, conserver les données supprimées est souvent une exigence légale.
3. **Cohérence des FK** : les commentaires et likes référencent l'article — un DELETE physique nécessiterait de cascader ou d'orpheliner ces données.
4. **Simplicité** : l'enum `ArticleStatus` (DRAFT / PUBLISHED / DELETED) unifie la gestion de l'état d'un article dans un seul champ.

## Conséquences

- Toutes les requêtes publiques filtrent explicitement `status != 'DELETED'`
- `canEditArticle()` vérifie `status === 'DELETED'` avant d'autoriser une modification (retourne 404 pour ne pas révéler l'existence)
- Aucun `DELETE SQL` physique sur la table `Articles` dans tout le code applicatif — règle documentée dans `CLAUDE.md`
- Les commentaires et likes d'un article soft-deleted restent en base mais ne sont plus accessibles
