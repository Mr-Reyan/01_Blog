# Engineering Decisions - Blog Platform

> DRAFT written from the source code and its comments. Rewrite the "why" in your own words so it is what you actually reasoned; the reviewer will ask. Search for `<<FILL` and `<<VERIFY` before submitting.

## 1. Decision log

### D1. One custom `User` table with a `role` field
- **Options:** (a) custom user + role enum, (b) Django Groups and permissions, (c) separate Author/Admin tables.
- **Chosen:** (a).
- **Why:** only two roles are needed, and one table keeps auth simple (stated in the model docstring).
- **Trade-off:** coarse-grained; finer permissions later would need Groups layered on top.

### D2. UUID primary keys and slugs as the public identifier
- **Options:** auto-increment integers vs UUIDs; ids vs slugs in URLs.
- **Chosen:** UUID PKs on every model; posts and categories are addressed by unique slug.
- **Why:** UUIDs cannot be enumerated; slugs give readable URLs.
- **Trade-off:** larger indexes; slugs must stay unique (post slug generation is not race-safe, gap G8).

### D3. JWT authentication (SimpleJWT)
- **Options:** session cookies, DRF token auth, JWT.
- **Chosen:** JWT access + refresh tokens.
- **Why:** stateless API that any client can call with a bearer header.
- **Trade-off:** tokens cannot be revoked before expiry unless blacklisting is wired up (gap G1).

### D4. One visibility rule, and 404 instead of 403 for hidden drafts
- **Options:** check visibility inside every view vs one shared function.
- **Chosen:** `services.visible_posts_for(user)` is the only place that decides which posts a caller can see; views build their querysets from it.
- **Why:** consistent behaviour across posts and comments, and a draft's existence is not leaked.
- **Trade-off:** ownership checks for some actions rely on this queryset rather than on object permissions (gap G4).

### D5. Server-controlled fields (protection against mass assignment)
- **Chosen:** `author`, `slug`, `status`, `published_at`, `is_visible`, and the `post` of a comment are read-only or set by the server. Clients cannot self-assign `ADMIN` at registration.
- **Why:** these fields drive permissions and workflow; clients must not set them.
- **Evidence:** dedicated negative tests for each (see `test-cases.xlsx`, permission tests).

### D6. Publishing is a separate action, not a field update
- **Options:** let clients PATCH `status`, or `POST /posts/{slug}/publish/`.
- **Chosen:** the dedicated action. A second publish returns 409.
- **Why:** one controlled place sets `published_at`, and the repeat case is explicit.

### D7. Deletion rules
- **Chosen:** `Post.author` uses PROTECT (a user with posts cannot be deleted); comments CASCADE with their post; deleting a category only detaches it from posts.
- **Why:** never lose posts by accident; remove comments that make no sense without their post.

### D8. Flat categories, admin-managed
- **Why:** matches the MVP scope; a `parent` self-FK can be added later without breaking rows (noted in the model).

### D9. Search and filtering with DRF built-ins
- **Options:** DRF `SearchFilter` (SQL `icontains`), PostgreSQL full-text search, Elasticsearch.
- **Chosen:** `SearchFilter` on title and body, plus `category` and `mine` query parameters.
- **Why:** fastest correct option for an MVP.
- **Trade-off:** full scans on large tables; see Scaling in `cost-and-scaling.xlsx`.

### D10. Login rate limiting
- **Chosen:** DRF `ScopedRateThrottle` with scope `login`. Rate: <<FILL: value from settings>>.
- **Why:** slows password guessing on the one endpoint that checks credentials.

### D11. Testing approach
- **Chosen:** pytest + pytest-django with `APIClient` and shared fixtures (author, other author, admin, category, draft, published post, comment). 113 tests covering positive, negative, boundary, permission, duplicate/retry and regression cases.
- **Note:** `force_authenticate` is used for most tests; the token flow itself is tested in the auth tests.

## 2. Security

- Passwords are hashed by Django (`create_user`); the API never returns them (tested).
- Role assignment at registration is ignored; admins come from `createsuperuser`.
- Authorization has three layers: authentication, role/object permissions (`IsAdminRole`, `IsOwnerOrAdmin`), and queryset visibility.
- Hidden resources return 404, not 403.
- Login is throttled (D10).
- Secrets are read from environment variables, none committed <<VERIFY: grep the repo and git history for the secret key and any .env>>.
- **Not implemented:** email verification, password reset, throttling on register/refresh (gap G7), CORS policy <<FILL>>, HTTPS (a deployment concern).

## 3. Technical risks

- Unpaginated list endpoints can return very large payloads (G6).
- `icontains` search does not scale to large post tables.
- Counters (`view_count`, `comment_count`) can drift or stay at zero (G2).
- Slug generation can collide under concurrent writes (G8).
- Single service, single database: no redundancy in the MVP.

## 4. Implemented vs planned

| Item | Status |
|---|---|
| Auth, roles, posts, drafts/publish, categories, comments, search/filter | Implemented |
| 113 automated tests | Implemented |
| Login throttling | Implemented |
| OpenAPI spec | Implemented (hand-written, `openapi.yaml`) |
| Docker | <<FILL: Implemented or Proposed>> |
| CI/CD | <<FILL: Implemented or Proposed>> |
| Cache (e.g. Redis) | Proposed |
| Queue / background workers | Proposed |
| Monitoring / logging stack | <<FILL: Implemented or Proposed>> |
| Avatars via object storage | Proposed (noted in the model) |
| Nested comment replies, post excerpt | Proposed (fields are commented out in the model) |

Mark anything here as Implemented only if it is really in the repository.

## 5. Known gaps and remediation

| ID | Gap | Impact | Remediation |
|---|---|---|---|
| G1 | `LogoutView` exists but is not routed in `urls.py`; blacklisting also needs `rest_framework_simplejwt.token_blacklist` in `INSTALLED_APPS` <<VERIFY>> | Tokens cannot be revoked | Add the route and a test, or remove the view |
| G2 | `comment_count` and `view_count` are never updated (comment create/delete do not touch them) | Counters always read 0 | Update with `F()` expressions in a service function, or remove the fields |
| G3 | `view_count` is not in the serializer's `read_only_fields`, so a client can set it <<remove this row once fixed>> | Clients can fake view counts | Add `"view_count"` to `read_only_fields` |
| G4 | `@action(permission_classes=...)` on `publish` is ignored because `get_permissions()` returns `IsAuthenticated` for custom actions. Safety comes from visibility (drafts are 404 for non-owners). A non-owner on a published post gets 409, not 403 | Intended ownership check is not what protects the endpoint | Add `"publish"` to the owner-or-admin branch of `get_permissions()`; the related test then expects 403 |
| G5 | Comment creation checks `role != "ADMIN"` while the rest of the app uses `is_admin()` (role or superuser) | A superuser whose role is AUTHOR gets 409 on other users' drafts | Use `request.user.is_admin()` |
| G6 | No pagination | Large responses | `PageNumberPagination` or cursor pagination; update the list tests |
| G7 | No throttle on register or refresh | Account-creation spam | Add scoped throttles |
| G8 | Post slug uniqueness is checked before save (acknowledged in the code comment) | Rare `IntegrityError` under concurrency | Retry on `IntegrityError` |
| G9 | Post body limited to 1000 characters | Short for a blog | Raise the limit if the product needs it |
| G10 | `Comment` docstring mentions replies, but the `parent` field is commented out | Misleading docs | Update the docstring |