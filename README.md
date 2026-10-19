# Blog Platform (Weekend 1 - 01_Blog)

## Purpose

A multi-user blog platform exposed as a REST API. Authors register, write posts as drafts, publish them, and organise them in categories. Readers can browse, search and filter published posts and comment when logged in. Admins moderate content and manage categories.

## Tech stack

| Layer | Choice |
|---|---|
| Language | Python 3.13 |
| Framework | Django 5.2.8 + Django REST Framework |
| Auth | JWT bearer tokens via `djangorestframework-simplejwt` |
| Database | SQLite |
| Tests | pytest 9.1.1 + pytest-django 4.12.0 |
| Frontend | Next.js |

## Scope (implemented)

- Registration, login, token refresh, current-user endpoint
- Two roles: `AUTHOR` (default) and `ADMIN`
- Posts: create, read, update, delete, `DRAFT` -> `PUBLISHED` via a dedicated publish endpoint
- Categories: public read, admin-only create/update/delete
- Comments: public read on visible posts, authenticated create, owner/admin delete, admin can hide
- Search (title and body), filter by category, `?mine=true`, ordering

Full endpoint reference: [`openapi.yaml`](openapi.yaml).

## Roles and permissions

| Action | Anonymous | AUTHOR | ADMIN |
|---|---|---|---|
| Read published posts and comments | yes | yes | yes |
| Read someone else's draft | no (404) | no (404) | yes |
| Create post (always DRAFT) | no (401) | yes | yes |
| Edit / delete own post | - | yes | yes |
| Edit / delete someone else's published post | no | no (403) | yes |
| Publish a post | no (401) | own drafts | any draft |
| Create / edit / delete category | no (401) | no (403) | yes |
| Comment | no (401) | yes | yes |
| Delete a comment | no (401) | own only (403 otherwise) | any |

## Assumptions

- Anyone can register; new accounts are always `AUTHOR`. Admins are created with `createsuperuser` (the app treats `role == ADMIN` or `is_superuser` as admin).
- Categories are flat (no nesting) and managed only by admins.
- Comments are flat (no replies) and limited to 500 characters; post bodies are 10-1000 characters.
- List endpoints return plain arrays; pagination is out of MVP scope.
- A hidden draft returns 404, not 403, so its existence is not revealed.

## Architecture summary

Client -> Django REST API (`/api/v1/`) -> db.sqlite. Code layout inside `blog/`:

- `models.py` - `User` (custom, with role), `Category`, `Post`, `Comment`
- `views/` - `auth.py`, `post.py`, `category.py`, `comment.py`
- `serializers.py` - input validation and read-only field protection
- `permissions.py` - `IsOwnerOrAdmin` (object-level)
- `services.py` - `visible_posts_for(user)`, the single post-visibility rule
- `urls.py` - routes under `/api/v1/`

Diagram: `architecture.pdf`. Reasoning and trade-offs: `engineering-decisions.md`.

## Setup, run, test (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt        
python manage.py migrate
python manage.py createsuperuser       # creates an admin
python manage.py runserver             # API at http://localhost:8000/api/v1/
```

Run the tests:

```powershell
pytest -v
```

Last full run: 113 passed in 76.39 s (Python 3.13.7, Django 5.2.8). Test cases and evidence: `test-cases.xlsx`.

## Environment variables (names only, no secrets)

| Variable | Purpose |
|---|---|
| SECRET_KEY | django-secret-key |
| DEBUG | true |

## Quick API walkthrough

```bash
# register, log in, then use the access token
curl -X POST http://localhost:8000/api/v1/auth/register/ -H "Content-Type: application/json" -d '{"username":"alice","password":"s3curePass!"}'
curl -X POST http://localhost:8000/api/v1/auth/login/    -H "Content-Type: application/json" -d '{"username":"alice","password":"s3curePass!"}'
curl -X POST http://localhost:8000/api/v1/posts/ -H "Authorization: Bearer <access>" -H "Content-Type: application/json" -d '{"title":"Hello","body":"A body of at least ten characters."}'
curl -X POST http://localhost:8000/api/v1/posts/hello/publish/ -H "Authorization: Bearer <access>"
```

## Known gaps

Listed with impact and planned fix in `engineering-decisions.md` (section 5). Headline items: post counters not maintained, no pagination, no Docker/CI in the repo .