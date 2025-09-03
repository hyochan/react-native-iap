# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Prerequisites

This project uses [Bun](https://bun.sh) as the package manager. Please ensure you have Bun installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Installation

```bash
bun install
```

## Local Development

```bash
bun run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
bun run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment is handled by the GitHub Actions workflow in `.github/workflows/docs.yml`.

For manual deployment:

Using SSH:

```bash
USE_SSH=true bun run deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> bun run deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

## Writing Documentation

- API documentation goes in `docs/api/`
- Guides go in `docs/guides/`
- Blog posts go in `blog/` with the format `YYYY-MM-DD-title.md`

## Important Notes

- **Do NOT use npm or yarn** - This project uses Bun exclusively
- Make sure to run `bun install` after pulling changes
- The `package-lock.json` file should not exist (we use `bun.lock` instead)
