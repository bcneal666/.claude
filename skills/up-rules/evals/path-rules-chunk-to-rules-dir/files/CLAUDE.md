# Project rules

- Reply in Traditional Chinese (Taiwan).
- Use `pnpm`, never `npm` or `yarn`, because the lockfile is pnpm-lock.yaml.
- React components in `src/components/` use named exports and keep one component per file, so that the barrel file in `src/components/index.ts` stays accurate.
- SQL migrations in `db/migrations/` must be reversible: every file has a `-- down` section. Never edit a migration that is already merged; add a new one instead, because production has applied the old ones.
