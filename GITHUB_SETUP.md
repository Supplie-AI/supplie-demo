# Supplie Demo — GitHub Setup Complete

**Repo:** https://github.com/Supplie-AI/supplie-demo  
**Status:** ✅ Created, code pushed, secrets configured  
**Workflows:** ⚠️ Local only (pending token scope fix)

---

## ✅ What's Done

### Repository

- Created `Supplie-AI/supplie-demo` (public)
- Initial code pushed to `main` branch
- Description: "Supplie demo: same model, different capabilities (raw vs grounded tools)"

### GitHub Actions Secrets (all set)

- `VERCEL_TOKEN` — Vercel CI/CD token
- `OPENAI_API_KEY` — OpenAI API key for build tests
- `DEMO_PASSWORD` — supplie2026
- `VERCEL_ORG_ID` — team_czbJDWKOasfsgCkQtJQGs65Z
- `VERCEL_PROJECT_ID` — prj_A3yTOSPmfVRHiLZ0tBfPuHlbt1Uz

### CI/CD Pipelines (files created, not pushed yet)

**Location:** `~/workspace/supplie-demo/.github/workflows/` on raspi-4b

**dev.yml** (PR + dev branch):

- ESLint + Prettier
- npm audit (moderate level)
- TypeScript type check
- Next.js build test
- Vercel preview deploy (ephemeral URL per PR)
- PR comment with preview URL

**prod.yml** (main branch):

- Full lint + security checks (high audit level)
- TypeScript validation
- Next.js production build
- Deploy to Vercel production
- Auto-tag releases (semantic versioning: YYYY.MM.DD-HHMM)

---

## ⚠️ Action Required

**GitHub token missing `workflow` scope:**

```
error: refusing to allow an OAuth App to create or update workflow
`.github/workflows/dev.yml` without `workflow` scope
```

**Fix:**

1. Go to https://github.com/settings/tokens
2. Find the token used by `gh` CLI on raspi-4b (check `gh auth status`)
3. Add `workflow` scope (allows modifying GitHub Actions workflows)
4. Re-authenticate: `gh auth refresh -s workflow`
5. Push workflows:

```bash
cd ~/workspace/supplie-demo
git push origin main
```

**Alternatively:** Push the workflows manually via GitHub web UI or create a PR from a new branch.

---

## 📋 Issue Management (TODO)

### Labels to create

```bash
gh label create bug --color d73a4a --description "Something isn't working"
gh label create enhancement --color a2eeef --description "New feature or request"
gh label create security --color d93f0b --description "Security vulnerability or audit"
gh label create ui/ux --color 0075ca --description "User interface or experience"
gh label create docs --color 0075ca --description "Documentation improvements"
gh label create infrastructure --color 1d76db --description "Build, deploy, CI/CD"
gh label create blocked --color fbca04 --description "Blocked by external dependency"
gh label create needs-review --color fbca04 --description "Ready for review"
```

### Issue templates

Create `.github/ISSUE_TEMPLATE/` with:

- `bug_report.md` — structured bug reports
- `feature_request.md` — feature proposals
- `security_vulnerability.md` — private security reports

### Branch protection

Enable on `main`:

- Require PR before merging
- Require status checks (lint, build)
- Require 1 approval (when team grows)

---

## 🛠️ Skills Needed for Multi-Issue Workflow

Both NeoClaw and DevBox agent (192.168.8.45) should have:

### `gh-workflow` skill (custom)

**Purpose:** Manage GitHub issues, PRs, and CI status via `gh` CLI.

**Core commands:**

```bash
# Issues
gh issue create --title "..." --body "..." --label bug
gh issue list --state open --label bug
gh issue view 42
gh issue close 42 --comment "Fixed in #43"

# PRs
gh pr create --title "..." --body "..." --draft
gh pr list --state open
gh pr view 12
gh pr checks  # Show CI status
gh pr merge 12 --squash

# CI
gh run list --workflow dev.yml
gh run view 123456
gh run watch  # Live tail
```

**Integration with OpenClaw:**

- Spawn subagent per issue: `sessions_spawn` with GitHub issue context
- Update issue on completion: `gh issue comment` with results
- Link PRs: `gh pr create --body "Closes #42"`

**Skill location:** `~/.openclaw/workspace/skills/gh-workflow/SKILL.md`

---

## 🔄 Recommended Dev Workflow

### For Jack (manual work)

1. Create issue: `gh issue create --title "Fix empty state UI" --label ui/ux`
2. Delegate to NeoClaw: "Fix issue #42"
3. NeoClaw spawns subagent → creates branch → makes changes → opens PR
4. GitHub Actions run checks (lint, build, preview deploy)
5. Jack reviews PR, merges
6. prod.yml deploys to Vercel production, tags release

### For NeoClaw (orchestration)

1. Read issue context
2. Spawn subagent (DevBox agent or OpenClaw ACP harness)
3. Subagent creates branch, commits, pushes
4. NeoClaw opens PR: `gh pr create --title "Fix #42: ..." --body "Closes #42"`
5. Monitor CI: `gh pr checks` until green
6. Report back to Jack with PR URL

### For DevBox agent (hands-on work)

- Make code changes on raspi-4b
- Run tests locally
- Commit + push to feature branch
- Report completion (NeoClaw opens PR)

---

## Next Steps

1. **Fix GitHub token scope** (add `workflow`)
2. **Push workflows** to main branch
3. **Create labels** via `gh label create`
4. **Write `gh-workflow` skill** and test with a dummy issue
5. **Enable branch protection** on main
6. **Test full cycle:** issue → branch → PR → CI → merge → deploy

---

**Commit:** Workflows are committed locally (`8eda10a`), pending push.
