# Review PR Comments

Review and address PR review comments for this repository.

## Arguments

- `$ARGUMENTS` - PR number (e.g., `123`) or PR URL

## Project-Specific Build Commands

Based on changed files, run these checks BEFORE committing:

| Path        | Commands                                        |
| ----------- | ----------------------------------------------- |
| `src/`      | `yarn typecheck && yarn lint && yarn test`      |
| `ios/`      | `cd example/ios && bundle exec pod install`     |
| `android/`  | `cd example/android && ./gradlew assembleDebug` |
| `plugin/`   | `yarn typecheck && yarn test`                   |
| `*.podspec` | `pod lib lint --allow-warnings`                 |

## Project Conventions

When reviewing, check these project-specific rules:

- **iOS functions**: Must end with `IOS` suffix (e.g., `getStorefrontIOS`)
- **Android functions**: Must end with `Android` suffix (e.g., `consumePurchaseAndroid`)
- **Cross-platform functions**: No suffix (e.g., `initConnection`, `fetchProducts`)
- **Generated files**: Do NOT edit files in `nitrogen/generated/` or `src/types.ts`
- **Type imports**: Use `import type` for type-only imports

See [CLAUDE.md](../../CLAUDE.md) for full conventions.

## Reply Format Rules (CRITICAL)

When replying to PR comments:

### Commit Hash Formatting

**NEVER wrap commit hashes in backticks or code blocks.** GitHub only auto-links plain text commit hashes.

| Format     | Example                 | Result                   |
| ---------- | ----------------------- | ------------------------ |
| ✅ CORRECT | `Fixed in f3b5fec.`     | Clickable link to commit |
| ❌ WRONG   | `Fixed in \`f3b5fec\`.` | Plain text, no link      |

**Examples of correct replies:**

```text
Fixed in f3b5fec.

**Changes:**
- Updated listener registration order
```

```text
Fixed in abc1234 along with other review items.
```

**Do NOT use backticks around the commit hash** - this breaks GitHub's auto-linking feature.

## Workflow

1. Fetch PR review comments (code-level comments):

   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/comments
   ```

   This returns individual review comments with their `id` fields needed for replies.

2. Also fetch general PR comments if needed:

   ```bash
   gh pr view <number> --comments
   ```

3. Review each comment and understand the requested change

4. Make the necessary code changes

5. Run relevant build commands based on changed files

6. Commit with descriptive message referencing the review

7. Push changes

8. Reply to **each individual review comment** using the comment's `id`:
   ```bash
   gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies -f body="Fixed in abc1234."
   ```
   **IMPORTANT:** Always reply directly to individual comments, NOT as a general PR review comment. Use the `/pulls/comments/{id}/replies` endpoint, NOT `gh pr review --comment`.
