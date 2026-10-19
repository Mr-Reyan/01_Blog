# Sources and Disclosure - Blog Platform

> DRAFT. Edit every `<<FILL` so it matches what actually happened. This file is a statement under the assignment's AI policy, so it must be accurate.

## 1. Open-source repositories reused or adapted

<<FILL: if you built the project from scratch, write exactly:>>
**None.** No repository was copied or adapted; the application code and tests are original work.

<<FILL: otherwise, for each repository: URL, licence, what was reused, what you modified, what is your own work.>>

## 2. Libraries used as dependencies (not adapted)

| Library | Licence | Use |
|---|---|---|
| Django | BSD-3-Clause | Web framework and ORM |
| Django REST Framework | BSD-3-Clause | REST API layer |
| djangorestframework-simplejwt | MIT | JWT authentication |
| pytest | MIT | Test runner |
| pytest-django | BSD-3-Clause | Django integration for pytest |
| <<FILL: other packages from requirements.txt>> | | |

<<VERIFY the licences on each package's PyPI page and add the access date.>>

## 3. AI use

- **Tool:** Claude (Anthropic), used through the claude.ai chat interface.
- **Areas assisted:** <<FILL and keep only what is true>>
  - `test-cases.xlsx`: generated from my own pytest files and my pytest run output.
  - `openapi.yaml`, `README.md`, `engineering-decisions.md`, `sources-and-disclosure.md`, `submission-index.md`: first drafts written from my source code, then edited by me.
  - Review comments on my code that identified the gaps listed in `engineering-decisions.md` section 5.
- **Not AI-assisted:** <<FILL: for example the application code, the pytest suite, the diagrams, the demo>>
- **Verification:**
  - I ran the full test suite myself (`pytest -v`: 113 passed in 76.39 s).
  - I checked `openapi.yaml` against the views and serializers <<FILL: how, for example "by calling each endpoint in Swagger/Postman">>.
  - I read and edited every document and can explain each decision.

## 4. Citations for external pricing or technical claims

- Hosting prices: see the source URL and access date columns in `cost-and-scaling.xlsx`.
- Technical references: <<FILL: Django / DRF / SimpleJWT documentation URLs you actually used, or "None">>.