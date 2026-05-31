# Contributing

Thanks for taking the time to improve Notification Hub.

## Development Setup

```bash
npm install
cp .env.example .env
npm run dev:infra
npm run prisma:migrate
npm run seed
npm run start:dev
```

Useful URLs:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

## Quality Gate

Run the full local verification before opening a pull request:

```bash
npm run ci:verify
```

This validates Prisma, regenerates the client, checks formatting, runs ESLint, runs tests, and builds the app.

## Pull Request Guidelines

- Keep changes scoped to one behavior or concern.
- Add or update tests for service behavior, authorization boundaries, and delivery state transitions.
- Include Prisma migrations when changing `prisma/schema.prisma`.
- Update `README.md` or `docs/INTEGRATION.md` for public API or deployment changes.
- Do not commit real credentials, API keys, or provider tokens.

## Commit Style

Use short imperative commit messages, for example:

```text
Add delivery outbox recovery
Mask channel config secrets
```

## Reporting Security Issues

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
