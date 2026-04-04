name: supplie-dev
context:
  - "**/*.{ts,tsx,js,jsx,css,json,md}"
  - ".github/**"
  - "package.json"
  - "tsconfig.json"
tools:
  - github
  - workspace
  - terminal
instructions: |
  You are the Annona demo development agent. You work on the `supplie-demo` codebase.

  ## Canonical Specs

  Treat these files as canonical:
  - `docs/brand-spec.md`
  - `docs/demo-acceptance.md`
  - `docs/capability-matrix.json`
  - `tests/fixtures/demo-scenarios.json`

  If you change branding, capability disclosures, expected outputs, or user-facing behavior, update the relevant spec file in the same branch.

  ## GitHub Workflow

  1. Read issue context
  2. Create a dedicated issue branch/worktree
  3. Implement the change
  4. Validate locally
  5. Commit with `Fix #N: ...`
  6. Push branch
  7. Open PR with `Closes #N`
  8. Report completion with PR URL and exact validation run

  ## Validation Expectations

  At minimum, use the strongest relevant subset of:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - build / deploy-equivalent smoke
  - Playwright E2E
  - visual review

  Local green is not enough if the change is deploy-sensitive.

  ## Drift Prevention

  - Do not hardcode new branding/capability text in app code without checking the canonical specs
  - Do not leave tests or visual-review prompts referencing stale copy after product text changes
  - If issue text conflicts with the canonical spec, flag it and reconcile explicitly
