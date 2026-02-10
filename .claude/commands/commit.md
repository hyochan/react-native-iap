# Commit Changes

Complete workflow: branch → commit → push → PR

## Usage

```
/commit [options]
```

**Options:**

- `--push` or `-p`: Push to remote after commit
- `--pr`: Create PR after push (implies --push)
- `--all` or `-a`: Commit all changes at once
- `<path>`: Commit only specific path (e.g., `src/hooks`)

## Examples

```bash
# Full workflow: commit, push, create PR
/commit --pr

# Commit all changes and create PR
/commit --all --pr

# Just commit specific path
/commit src/hooks

# Commit and push without PR
/commit --push
```

## Complete Workflow

### 1. Check Branch

```bash
# Check current branch
git branch --show-current
```

**If on `main`** → Create a feature branch first:

```bash
git checkout -b feat/<feature-name>
```

**If NOT on `main`** → Proceed with commits directly.

**Branch naming conventions:**

- `feat/<feature-name>` - New features
- `fix/<bug-description>` - Bug fixes
- `docs/<doc-update>` - Documentation only
- `chore/<task>` - Maintenance tasks

### 2. Check Current Status

```bash
git status
git diff --name-only
```

### 3. Stage Changes

**Specific path:**

```bash
git add <path>
```

**All changes:**

```bash
git add .
```

### 4. Review Staged Changes

```bash
git diff --cached --stat
git diff --cached --name-only
```

### 5. Create Commit

Follow conventional commit format:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<body - what changed and why>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**Commit Types:**

| Type       | Description           |
| ---------- | --------------------- |
| `feat`     | New feature           |
| `fix`      | Bug fix               |
| `docs`     | Documentation only    |
| `refactor` | Code refactoring      |
| `chore`    | Maintenance tasks     |
| `test`     | Adding/updating tests |

**Scope Examples:**

- `ios` - iOS native code changes
- `android` - Android native code changes
- `hooks` - React hooks (useIAP)
- `types` - TypeScript type definitions
- `nitro` - Nitro module specs
- `podspec` - CocoaPods configuration

### 6. Push to Remote

```bash
git push -u origin <branch-name>
```

### 7. Create Pull Request

```bash
gh pr create --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary

<1-3 bullet points describing changes>

## Changes

### <Category 1>
- Change 1
- Change 2

### <Category 2>
- Change 1

## Test plan

- [ ] `yarn typecheck` passes
- [ ] `yarn lint` passes
- [ ] `yarn test` passes

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

---

## Commit Order (Recommended)

When making cross-platform changes, commit in this order:

| Order | Path                  | Description                                |
| ----- | --------------------- | ------------------------------------------ |
| 1     | `src/specs/`          | Nitro interface definitions                |
| 2     | `nitrogen/generated/` | Generated Nitro files (after `yarn specs`) |
| 3     | `ios/`                | iOS native implementation                  |
| 4     | `android/`            | Android native implementation              |
| 5     | `src/`                | TypeScript implementation                  |
| 6     | `src/__tests__/`      | Test files                                 |
| 7     | `*.podspec`           | CocoaPods configuration                    |

---

## Example Commit Messages

**Feature addition:**

```
feat(ios): add tvOS and macOS platform support

- Add tvOS 15.0 and macOS 14.0 to podspec platforms
- Add platform detection helpers (isTVOS, isMacOS, isStandardIOS)
- Skip promotedProductListenerIOS on tvOS/macOS
- Update Swift availability annotations

Closes #3141

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Bug fix:**

```
fix(hooks): register listeners after initConnection

Move listener registration after initConnection succeeds
to ensure Nitro runtime is fully initialized. This fixes
crashes on platforms where Nitro initializes later.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Chore/maintenance:**

```
chore(deps): update OpenIAP to 1.3.11

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Example PR Body

```markdown
## Summary

- Add tvOS 15.0 and macOS 14.0 platform support
- Fix Nitro initialization timing for non-iOS platforms
- Add platform detection helpers

## Changes

### Podspec (NitroIap.podspec)

- Add `:tvos => '15.0'` and `:macos => '14.0'` platforms

### iOS Native (ios/)

- Update `@available` to include all platforms

### TypeScript (src/)

- Add `isTVOS()`, `isMacOS()`, `isStandardIOS()` helpers
- Skip promoted product listener on tvOS/macOS
- Register listeners after initConnection succeeds

### Tests (src/\_\_tests\_\_/)

- Add platform detection tests

## Test plan

- [x] `yarn typecheck` passes
- [x] `yarn lint` passes
- [x] `yarn test` passes

🤖 Generated with [Claude Code](https://claude.ai/code)
```

---

## Quick Reference

```bash
# Full workflow from main
git checkout -b feat/my-feature
git add .
git commit -m "feat(scope): description"
git push -u origin feat/my-feature
gh pr create --title "feat(scope): description" --body "..."
```
