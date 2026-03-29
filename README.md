# Easy-poems

The project helps users write and analyse poems with **interactive AI feedback**, **writing aids** (spelling, syllables, and related tools), and clear **ratings with explanations**.

## Project docs

- [Product requirements](docs/REQUIREMENTS.md) — vision, functional/non-functional requirements, open questions.
- [Priorities / MVP backlog](docs/PRIORITIES.md) — MoSCoW and phased delivery.
- [AI integration](docs/AI_INTEGRATION.md) — OpenAI proxy, `POST /api/analyze`, JSON contract.
- [Design folder](design/README.md) — where to put flows, wireframes, and mockups.

## Analysis API (local dev)

```bash
cd server
copy .env.example .env
# Edit .env: set OPENAI_API_KEY

npm install
npm run dev
```

- Tests: `npm test` (contract normalization + HTTP smoke with mocked OpenAI).

- Health: `GET http://localhost:8787/health`
- Analyze: `POST http://localhost:8787/api/analyze` with JSON body `{ "title": "...", "lines": ["..."] }`
