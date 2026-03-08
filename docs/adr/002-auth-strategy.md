# ADR-002 — Stratégie d'authentification : JWT vs Sessions

**Date** : 2025-01
**Statut** : Accepté

---

## Contexte

L'API doit authentifier les utilisateurs et contrôler les accès (RBAC). Le choix porte entre JWT (stateless) et sessions serveur (stateful).

## Options considérées

### Option A — JWT (JSON Web Tokens)
- Token signé côté serveur, stocké côté client
- Stateless : aucun état serveur à maintenir
- Auto-contenu : `id` et `role` embarqués dans le payload
- Expiration configurable (`JWT_EXPIRES_IN`)

### Option B — Sessions serveur (express-session + Redis)
- Session ID stocké en cookie, état en Redis
- Révocation immédiate possible
- Nécessite Redis (infrastructure supplémentaire)

## Décision

**JWT**, pour les raisons suivantes :

1. **Stateless** : adapté à une API REST pure — pas de dépendance à un store de sessions.
2. **Simplicité d'infrastructure** : pas de Redis nécessaire pour ce projet de portfolio.
3. **RBAC embarqué** : le `role` dans le payload évite une requête DB à chaque requête protégée.
4. **Standard API** : les clients (mobile, SPA, Postman) gèrent naturellement les JWT en header `Authorization: Bearer`.

## Conséquences

- Révocation impossible avant expiration (7 jours par défaut) — acceptable pour un portfolio, une blacklist Redis serait nécessaire en production réelle.
- `JWT_SECRET` doit faire ≥ 32 chars en production — validé au démarrage dans `src/config/index.ts`.
- `author_id` toujours extrait du JWT (`req.user.id`), jamais du body — prévient l'usurpation d'identité.
- Middleware `authenticate` vérifie la signature + l'expiration. Middleware `authorize(...roles)` vérifie le rôle.
