# Project Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up the root directory and organize project files into a logical, standard structure using best practices.

**Architecture:** 
- Root directory will only contain essential configuration files and the `src` folder.
- All source code remains in `src`.
- Documentation and mockups moved to `docs`.
- Development scripts moved to `scripts/dev`.
- Database migrations and SQL scripts consolidated under `supabase`.
- Leftover logs and reports removed.

**Tech Stack:** Next.js, Supabase, TypeScript

---

### Task 1: Create New Directory Structure

**Files:**
- Create: `docs/setup`
- Create: `docs/mockups`
- Create: `scripts/dev`
- Create: `supabase/scripts`

**Step 1: Create directories**
Run: `mkdir -p docs/setup docs/mockups scripts/dev supabase/scripts`

**Step 2: Commit**
```bash
git add docs scripts supabase
git commit -m "chore: create directory structure for reorganization"
```

### Task 2: Move Documentation and Mockups

**Files:**
- Move: `ENV_SETUP.md` -> `docs/setup/ENV_SETUP.md`
- Move: `STRIPE_SETUP.md` -> `docs/setup/STRIPE_SETUP.md`
- Move: `Abacatepay integraçoes.txt` -> `docs/setup/Abacatepay_integraçoes.txt`
- Move: `*.html` (root) -> `docs/mockups/`

**Step 1: Move setup docs**
Run: `mv ENV_SETUP.md STRIPE_SETUP.md "Abacatepay integraçoes.txt" docs/setup/`

**Step 2: Move HTML mockups**
Run: `mv *.html docs/mockups/`

**Step 3: Commit**
```bash
git add docs
git commit -m "chore: move documentation and mockups to docs folder"
```

### Task 3: Move and Consolidate Database Files

**Files:**
- Move: `migrations/*.sql` -> `supabase/migrations/`
- Move: `sql/*.sql` -> `supabase/scripts/`
- Move: `*.sql` (root) -> `supabase/scripts/`
- Delete: `migrations/` (empty)
- Delete: `sql/` (empty)

**Step 1: Move migrations**
Run: `mv migrations/*.sql supabase/migrations/`

**Step 2: Move root SQL and other scripts**
Run: `mv sql/*.sql supabase/scripts/ && mv *.sql supabase/scripts/`

**Step 3: Commit**
```bash
git add supabase
git commit -m "chore: consolidate database migrations and scripts under supabase"
```

### Task 4: Move Development Scripts

**Files:**
- Move: `extract_errors.mjs` -> `scripts/dev/extract_errors.mjs`
- Move: `list_hook_errors.mjs` -> `scripts/dev/list_hook_errors.mjs`
- Move: `refactor.mjs` -> `scripts/dev/refactor.mjs`
- Move: `scan_error.mjs` -> `scripts/dev/scan_error.mjs`
- Move: `test_css_selectors.js` -> `scripts/dev/test_css_selectors.js`
- Move: `parse_lint.py` -> `scripts/dev/parse_lint.py`

**Step 1: Move scripts**
Run: `mv extract_errors.mjs list_hook_errors.mjs refactor.mjs scan_error.mjs test_css_selectors.js parse_lint.py scripts/dev/`

**Step 2: Commit**
```bash
git add scripts
git commit -m "chore: move development scripts to scripts/dev"
```

### Task 5: Clean Up Logs and Reports

**Files:**
- Delete: `*.log`
- Delete: `*.json` (if report/result)
- Delete: `*.txt` (if report/result)

**Step 1: Delete logs**
Run: `rm *.log`

**Step 2: Delete reports**
Run: `rm all_lints.json eslint_report.json eslint_report.txt fresh_lints.json lint-results.json lint_output.txt lint_output_fresh.txt lint_results.json lint_results.txt lint_results_utf8.json tsc_errors.txt tsc_errors_utf8.txt tsc_output.txt tsc_output_clean.txt current_lint.txt current_lint_utf8.txt`

**Step 3: Delete cache/build info**
Run: `rm tsconfig.tsbuildinfo`

**Step 4: Commit**
```bash
git commit -am "chore: cleanup logs, reports, and build info"
```

### Task 6: Final Review and Adjustments

**Step 1: Check root directory**
Run: `ls`

**Step 2: Ensure app still runs**
Run: `npm run dev`

**Step 3: Commit final adjustments**
```bash
git commit -m "chore: final reorganization adjustments"
```
