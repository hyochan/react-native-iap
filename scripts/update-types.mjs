#!/usr/bin/env node
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';

const DEFAULT_TAG = '1.0.1';
const PROJECT_ROOT = process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  let tag = DEFAULT_TAG;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tag' && typeof args[i + 1] === 'string') {
      tag = args[i + 1];
      i++;
    }
  }

  return {tag};
}

function getReleaseUrl(tag) {
  return `https://github.com/hyodotdev/openiap-gql/releases/download/${tag}/openiap-typescript.zip`;
}

function main() {
  const {tag} = parseArgs();
  const releaseUrl = getReleaseUrl(tag);
  const tempDir = mkdtempSync(join(tmpdir(), 'openiap-types-'));
  const zipPath = join(tempDir, 'openiap-typescript.zip');

  try {
    console.log(`Downloading OpenIAP types (tag: ${tag}) from ${releaseUrl}`);
    execFileSync('curl', ['-L', '-o', zipPath, releaseUrl], {
      stdio: 'inherit',
    });

    console.log('Extracting types.ts from archive');
    execFileSync('unzip', ['-o', zipPath, 'types.ts', '-d', tempDir], {
      stdio: 'inherit',
    });

    const extractedPath = join(tempDir, 'types.ts');
    let contents = readFileSync(extractedPath, 'utf8');
    contents = contents.replace(
      /Run `[^`]+` after updating any \*\.graphql schema file\./,
      'Run `bun run generate:types` after updating any *.graphql schema file.',
    );

    const destination = join(PROJECT_ROOT, 'src', 'types.ts');
    writeFileSync(destination, contents);
    console.log('Updated src/types.ts');
  } finally {
    rmSync(tempDir, {recursive: true, force: true});
  }
}

main();
