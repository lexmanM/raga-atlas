import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];

const forbiddenPaths = [
  '.openai',
  '.claude',
  '.cursor',
  '.codex',
  '.github/copilot-instructions.md',
];

for (const path of forbiddenPaths) {
  if (existsSync(join(repository, path))) {
    failures.push(`agent-specific repository path: ${path}`);
  }
}

const manifest = JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8'));
const dependencies = {
  ...manifest.dependencies,
  ...manifest.devDependencies,
};
const forbiddenPackages = [
  '@openai/sites-vite-plugin',
  '@anthropic-ai/sdk',
];

for (const dependency of forbiddenPackages) {
  if (dependency in dependencies) {
    failures.push(`agent-specific dependency: ${dependency}`);
  }
}

const scannedRoots = ['app', 'components', 'hooks', 'lib', 'backend'];
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.py', '.ts', '.tsx']);
const forbiddenSource = [
  ['agent runtime detection', /CODEX_SANDBOX|CLAUDE_CODE|CURSOR_AGENT/],
  ['agent-injected browser API', /document\.modelContext/],
  ['agent-vendor runtime import', /@openai\/sites-vite-plugin/],
];

function visit(path) {
  for (const entry of readdirSync(path)) {
    if (entry === '__pycache__') continue;
    const absolute = join(path, entry);
    if (statSync(absolute).isDirectory()) {
      visit(absolute);
      continue;
    }
    if (!sourceExtensions.has(extname(entry))) continue;
    const contents = readFileSync(absolute, 'utf8');
    for (const [label, pattern] of forbiddenSource) {
      if (pattern.test(contents)) {
        failures.push(`${label}: ${relative(repository, absolute)}`);
      }
    }
  }
}

for (const root of scannedRoots) {
  const path = join(repository, root);
  if (existsSync(path)) visit(path);
}

if (failures.length) {
  console.error('Agent-agnostic repository check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Agent-agnostic repository check passed.');
}
