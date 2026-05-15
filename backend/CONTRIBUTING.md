# Contributing to DocAi Backend

We welcome contributions! Please follow these guidelines.

## Getting Started

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/docai-backend.git
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run the development server:
   ```bash
   pnpm start:dev
   ```

## Branching

Use descriptive branch names:

- `fix/login-redirect`
- `feat/audit-log-ui`

## Code Style

- Use Prettier and ESLint (`pnpm lint`)
- Ensure all tests pass (`pnpm test`)
- Write or update tests where appropriate
- Follow existing architectural patterns (modular, layered)

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

- `feat: add user login flow`
- `fix: prevent crash on invalid token`
- `chore: update dependencies`

## Pull Requests

- Link issues or describe the motivation
- Include screenshots or test results if UI/API changes are involved
- Ensure CI passes

## Questions?

Open an [issue](https://github.com/VictorFajardo/docai-backend/issues) or contact @VictorFajardo.
