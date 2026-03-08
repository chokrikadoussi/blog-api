# Schéma de base de données

## Diagramme ER

```mermaid
erDiagram
    Users {
        int id PK
        string email UK
        string password_hash
        Role role
        datetime createdAt
    }

    Articles {
        int id PK
        string title
        string slug UK
        string content
        ArticleStatus status
        int authorId FK
        datetime createdAt
        datetime updatedAt
    }

    Comments {
        int id PK
        string content
        int articleId FK
        int authorId FK
        int parentId FK
        datetime createdAt
    }

    Tags {
        int id PK
        string name UK
        string slug UK
    }

    ArticleTags {
        int articleId FK
        int tagId FK
    }

    Likes {
        int userId FK
        int articleId FK
    }

    Users ||--o{ Articles : "écrit"
    Users ||--o{ Comments : "poste"
    Users ||--o{ Likes : "like"
    Articles ||--o{ Comments : "reçoit"
    Articles ||--o{ ArticleTags : "a"
    Articles ||--o{ Likes : "reçoit"
    Tags ||--o{ ArticleTags : "associé à"
    Comments ||--o{ Comments : "réponse à (parentId)"
```

## Enums

### `Role`
| Valeur | Description |
|---|---|
| `AUTHOR` | Peut créer/modifier/supprimer ses propres articles et commentaires |
| `MODERATOR` | Peut modifier/supprimer les articles et commentaires de tous les auteurs |
| `ADMIN` | Accès total, peut créer des tags |

### `ArticleStatus`
| Valeur | Description |
|---|---|
| `DRAFT` | Brouillon — visible uniquement par l'auteur |
| `PUBLISHED` | Publié — visible par tous |
| `DELETED` | Soft-deleted — jamais supprimé physiquement |

## Notes

- **Soft delete** : les articles ne sont jamais supprimés de la DB. Le statut passe à `DELETED`. Voir [ADR-003](adr/003-soft-delete.md).
- **Commentaires imbriqués** : la relation auto-référentielle `Comments.parentId → Comments.id` supporte un arbre de réponses. La suppression en cascade est gérée au niveau DB (`ON DELETE CASCADE`).
- **Clés composites** : `ArticleTags` et `Likes` utilisent des clés primaires composites (`articleId + tagId`, `userId + articleId`) pour garantir l'unicité sans colonne `id` séparée.
