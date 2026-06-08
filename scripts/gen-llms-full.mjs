import fs from 'node:fs';

const BASE = 'https://skinshark.gg/docs';

// Page order mirrors docs.json navigation.
const PAGES = [
  'index.mdx',
  'quickstart.mdx',
  'guides/authentication.mdx',
  'guides/on-behalf-of.mdx',
  'guides/envelope.mdx',
  'guides/money.mdx',
  'guides/pagination.mdx',
  'guides/idempotency.mdx',
  'guides/error-handling.mdx',
  'integration/core-api.mdx',
  'integration/full-platform.mdx',
  'integration/partner-crypto-payout.mdx',
  'guides/sdk.mdx',
  'guides/webhooks.mdx',
  'guides/websocket.mdx',
  'guides/live-market.mdx',
  'reference/data-models.mdx',
  'reference/errors.mdx',
  'reference/rate-limits.mdx',
];

function urlFor(file) {
  const slug = file.replace(/\.mdx$/, '');
  return slug === 'index' ? BASE : `${BASE}/${slug}`;
}

function splitFrontmatter(raw) {
  if (!raw.startsWith('---')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: raw };
  const fmBlock = raw.slice(3, end);
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');
  const fm = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { fm, body };
}

const out = [];
out.push('# SkinShark Merchant API');
out.push('');
out.push('> Server-to-server API for managing sub-users, wallets, deposits, and trades on SkinShark. This file inlines the full documentation for LLM ingestion. The curated index is at llms.txt; the machine-readable spec is at openapi.yaml.');
out.push('');

// 1. Narrative pages
for (const file of PAGES) {
  const raw = fs.readFileSync(file, 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const title = fm.title || file;
  out.push(`# ${title}`);
  out.push(`Source: ${urlFor(file)}`);
  out.push('');
  if (fm.description) {
    out.push(fm.description);
    out.push('');
  }
  out.push(body.trimEnd());
  out.push('');
  out.push('');
}

// 2. API reference parsed from openapi.yaml
const lines = fs.readFileSync('openapi.yaml', 'utf8').split(/\r?\n/);
const items = []; // {type:'group',title} | {type:'op',method,path,summary,description}
let inPaths = false;
let curPath = null;
let cur = null;
const pushCur = () => {
  if (cur) {
    items.push(cur);
    cur = null;
  }
};
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^[A-Za-z]/.test(line)) {
    pushCur();
    inPaths = line.startsWith('paths:');
    curPath = null;
    continue;
  }
  if (!inPaths) continue;
  const groupM = line.match(/^  #\s*([A-Z][A-Za-z0-9 /&'-]+?)\s*$/);
  if (groupM && !/^-+$/.test(groupM[1])) {
    const title = groupM[1].charAt(0) + groupM[1].slice(1).toLowerCase();
    items.push({ type: 'group', title });
    continue;
  }
  const pathM = line.match(/^  (\/[^:]*):\s*$/);
  if (pathM) {
    pushCur();
    curPath = pathM[1];
    continue;
  }
  const methM = line.match(/^    (get|post|put|patch|delete):\s*$/);
  if (curPath && methM) {
    pushCur();
    cur = { type: 'op', method: methM[1].toUpperCase(), path: curPath, summary: '', description: '' };
    continue;
  }
  if (!cur) continue;
  const sumM = line.match(/^      summary:\s*(.*)$/);
  if (sumM) {
    cur.summary = sumM[1].trim().replace(/^["']|["']$/g, '');
    continue;
  }
  const descM = line.match(/^      description:\s*(.*)$/);
  if (descM) {
    const rest = descM[1].trim();
    if (rest && !/^[|>][-+]?$/.test(rest)) {
      cur.description = rest.replace(/^["']|["']$/g, '');
    } else {
      const buf = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j];
        if (l.trim() === '') {
          buf.push('');
          continue;
        }
        if (/^ {8}/.test(l)) buf.push(l.slice(8));
        else break;
      }
      while (buf.length && buf[buf.length - 1] === '') buf.pop();
      cur.description = buf.join('\n');
      i = j - 1;
    }
  }
}
pushCur();

out.push('# API reference');
out.push(`Source: ${BASE}/openapi.yaml`);
out.push('');
out.push('Every endpoint of the merchant API. Authenticate with the `api-key` header; act as a sub-user with `On-Behalf-Of`. For exact request and response schemas, see the OpenAPI specification linked above.');
out.push('');
let opCount = 0;
for (const it of items) {
  if (it.type === 'group') {
    out.push(`## ${it.title}`);
    out.push('');
  } else {
    opCount++;
    out.push(`### ${it.method} ${it.path}`);
    if (it.summary) {
      out.push('');
      out.push(`**${it.summary}**`);
    }
    if (it.description) {
      out.push('');
      out.push(it.description);
    }
    out.push('');
  }
}

const text = out.join('\n').replace(/\n{3,}/g, '\n\n\n') + '\n';
fs.writeFileSync('llms-full.txt', text);
console.log(`wrote llms-full.txt: ${PAGES.length} pages, ${opCount} endpoints, ${text.split('\n').length} lines, ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`);
