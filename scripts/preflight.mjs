import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const webRoot = path.join(root, 'apps', 'web');
const failures = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(root);
for (const file of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
  const source = fs.readFileSync(file, 'utf8');
  const re = /(?:from\s+|import\(\s*)['\"](\.\.?\/[^'\"]+)['\"]/g;
  for (const match of source.matchAll(re)) {
    const spec = match[1];
    const base = path.resolve(path.dirname(file), spec);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) failures.push(`Missing import: ${path.relative(root, file)} -> ${spec}`);
  }
}

const apiSource = fs.readFileSync(path.join(webRoot, 'lib', 'api.ts'), 'utf8');
const apiMethods = new Set([...apiSource.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((m) => m[1]));
for (const file of walk(webRoot).filter((f) => /\.(ts|tsx)$/.test(f))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bapi\.([A-Za-z0-9_]+)\b/g)) {
    if (!apiMethods.has(match[1])) failures.push(`Missing API client method: ${path.relative(root, file)} -> api.${match[1]}`);
  }
}

for (const required of ['docker-compose.yml', 'apps/api/Dockerfile', 'apps/web/Dockerfile', 'apps/api/prisma/schema.prisma']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`Missing required file: ${required}`);
}

if (failures.length) {
  console.error(`Preflight failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Preflight passed. Checked ${files.length} files; relative imports and web API client references are consistent.`);
