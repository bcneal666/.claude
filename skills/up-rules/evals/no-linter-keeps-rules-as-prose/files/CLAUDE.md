# Project rules

- Always reply in Traditional Chinese (Taiwan).
- Run `npm test` before committing.
- Do not import `lodash` anywhere in `src/`; use `es-toolkit` instead, because lodash adds about 70KB to the client bundle.
- Never call `console.log` in `src/`; use `logger` from `src/lib/logger.js` so that logs reach the log collector.
- Keep functions short and readable, unless a long function is clearer, for example a state machine.
- Handlers in `src/api/` validate their input before touching the database.
