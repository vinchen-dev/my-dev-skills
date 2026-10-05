<!--
TEMPLATE FOR docs/standards.md — instructions for dev-standards (delete all template comments in the output):
- Keep every section heading, even if a section ends up short. Code review relies on these sections existing.
- The rules below are universal defaults (src: default). Keep, adjust or drop each one based on repo evidence.
- Add stack-pack rules and repo-specific rules into the matching section, with src tags.
- Replace every {{placeholder}}.
-->

# Coding standards

These standards define what good code looks like in this repo. They are used when writing code (`implement`, `dev-build`) and when reviewing it (`code-review`).

- **Must** rules are required. Code review reports violations as must-fix.
- **Prefer** rules are the default choice. Code review reports deviations as suggestions.
- These rules override generic best practices. When the code and a rule disagree, follow the rule and flag the conflict.

## Linting and formatting

- Must: The linter, formatter and type checker are the authority on anything they enforce. Run them using the commands in AGENTS.md; don't hand-apply or re-review their rules. <!-- src: default -->
- Must: New code introduces no new lint errors or type errors. <!-- src: default -->
- Must: Don't disable a lint rule inline without a comment explaining why. <!-- src: default -->

## Naming

- Must: Follow the casing conventions already used in this repo for files, types, functions and variables. {{describe them, e.g. files kebab-case, types PascalCase}} <!-- src: default -->
- Prefer: Names that describe intent over names that describe implementation. Avoid abbreviations except widely known ones (id, url, http, db). <!-- src: default -->
- Prefer: Booleans that read as a yes/no question (is, has, can, should). <!-- src: default -->
- Must: Use the project's domain terms consistently; don't introduce synonyms for existing concepts. <!-- src: default -->

## File and folder structure

{{Describe the repo layout in a few lines: where each kind of code lives, with real paths.}} <!-- src: {{code or doc name}} -->

- Must: Put new code where similar code already lives. Don't create new top-level folders or new structural patterns without a reason stated in the plan. <!-- src: default -->
- Must: Don't import another module's internal files when it exposes a public entry point. <!-- src: default -->
- Prefer: One main concept per file. Split a file when it serves unrelated concerns. <!-- src: default -->
- Must: Tests live where this repo's existing tests live: {{location convention}}. <!-- src: default -->

## Code design

- Must: Don't duplicate logic that already exists. Reuse it, or extract it if it's needed in more places. <!-- src: default -->
- Must: No dead code, commented-out code, or leftover debug output. <!-- src: default -->
- Prefer: Small functions that do one thing, with early returns over deep nesting. <!-- src: default -->
- Prefer: Clear, explicit code over clever code. <!-- src: default -->
- Prefer: No abstractions, options or extension points that nothing uses yet. <!-- src: default -->
- Prefer: Existing dependencies and the standard library over adding new dependencies. <!-- src: default -->

## Size and complexity

Limits apply to new and changed code. Touching an oversized legacy file means not making it bigger, not refactoring it.

- Line length is enforced by {{formatter}}; don't hand-review it. {{Delete this line when no formatter is configured.}} <!-- src: default -->
- Prefer: Files under {{soft limit, e.g. 400}} lines; split by responsibility when exceeded. <!-- src: default -->
- Must: No new file over {{hard limit, e.g. 800}} lines, and don't grow existing files past it. <!-- src: default -->
- Prefer: Functions under 50 lines, nesting at most 3 levels deep, at most 4 parameters (use an options object beyond that). <!-- src: default -->
- Excluded from limits: generated code, test fixtures, migrations, data files. <!-- src: default -->

## Error handling

- Must: Never swallow errors silently. Handle them, or pass them up with context. <!-- src: default -->
- Must: Validate input at system boundaries: API requests, user input, files, environment variables, external responses. <!-- src: default -->
- Must: Handle the failure paths of I/O (network, database, filesystem), not only the success path. <!-- src: default -->
- Prefer: Retry only operations that are safe to repeat, and when a multi-step operation fails part way, leave data consistent or roll back. <!-- src: default -->
- Prefer: Error messages that include enough context to debug, and never include secrets or personal data. <!-- src: default -->
- Must: Follow the repo's error-handling pattern: {{e.g. throw typed errors / return result objects}}. <!-- src: default -->

## Testing

- Must: Add or update tests for every change in behavior. <!-- src: default -->
- Must: Every bug fix includes a test that fails without the fix. <!-- src: default -->
- Prefer: Test behavior through public interfaces rather than implementation details. <!-- src: default -->
- Must: Tests are deterministic. Control time, randomness, network and ordering instead of depending on them. <!-- src: default -->
- Prefer: Test names that describe the expected behavior. <!-- src: default -->

## Performance and scalability

Expected scale: {{e.g. internal tool, ~50 users / public API, ~1M requests per day}} <!-- src: {{user or doc name}} -->

- Must: No database queries or network calls inside loops when they can be batched or joined. <!-- src: default -->
- Must: Bound unbounded work. Paginate or limit result sets, and set timeouts on external calls. <!-- src: default -->
- Must: Don't load large files or datasets fully into memory when they can be streamed or processed in chunks. <!-- src: default -->
- Must: Release what you acquire, on the error path too. Close files, connections, streams and listeners, clear timers, and give every cache a size or time bound. <!-- src: default -->
- Prefer: Don't block request handlers or the event loop with slow synchronous work. <!-- src: default -->
- Prefer: Cache only with a clear invalidation strategy. <!-- src: default -->

## Security

- Must: No secrets, keys or credentials in code. Use environment variables or the project's config mechanism. <!-- src: default -->
- Must: Never build queries, shell commands or file paths by concatenating untrusted input. Use parameterized queries and safe APIs. <!-- src: default -->
- Must: Check authorization on the server for every protected operation. <!-- src: default -->
- Must: Don't log secrets, tokens or personal data. <!-- src: default -->

## Comments and documentation

- Prefer: Comments explain why, not what. <!-- src: default -->
- Must: Update documentation when a change affects how something is used or configured. <!-- src: default -->
- Prefer: Document public interfaces following the repo's existing convention. <!-- src: default -->

## Repo decisions

<!--
Record decisions the user makes during dev-standards or later. Give each one the date, and the same trailing src tag the rules above use, with the value `user`. Example:
- Must: New services return result objects instead of throwing. Legacy services are migrated when touched. (decided 2026-09-24)
-->
