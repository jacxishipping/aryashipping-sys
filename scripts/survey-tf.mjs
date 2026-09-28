// ONE-SHOT survey: dump sx blocks of remaining <TextField> elements.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:\\Users\\RDP\\Documents\\GitHub\\aryashipping-sys';
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && p.endsWith('.tsx')) out.push(p);
  }
  return out;
}
function isEsc(s, i) { let n = 0, j = i - 1; while (j >= 0 && s[j] === '\\') { n++; j--; } return n % 2 === 1; }
function scanEl(src, start) {
  let i = start + '<TextField'.length, depth = 0, str = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (str) { if (c === str && !isEsc(src, i)) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
    if (depth === 0 && c === '>') return { header: src.slice(start, i + 1) };
  }
  return null;
}
function braced(s, open) {
  let depth = 0, str = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (str) { if (c === str && !isEsc(s, i)) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) return s.slice(open + 1, i); }
  }
  return null;
}
const files = walk(path.join(ROOT, 'src')).filter((f) => /<TextField\b/.test(fs.readFileSync(f, 'utf8')));
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let from = 0, n = 0;
  for (;;) {
    const idx = src.indexOf('<TextField', from);
    if (idx === -1) break;
    const el = scanEl(src, idx);
    from = idx + 10;
    if (!el) { console.log(path.relative(ROOT, file) + ' PARSE-FAIL'); continue; }
    n++;
    const line = src.slice(0, idx).split('\n').length;
    const m = /\bsx\s*=\s*\{/.exec(el.header);
    const sel = /\sselect(\s|\/|>)/.test(el.header);
    const spread = [...el.header.matchAll(/\{\.\.\.([A-Za-z_$][\w$]*)/g)].map((x) => x[1]);
    let sx = null;
    if (m) { const o = el.header.indexOf('{', m.index); sx = braced(el.header, o); }
    const tag = sel ? 'SELECT' : spread.length ? 'SPREAD:' + spread.join(',') : (m ? 'SX' : 'PLAIN');
    const preview = sx ? sx.replace(/\s+/g, ' ').slice(0, 300) : '';
    console.log(path.relative(ROOT, file) + ':' + line + ' [' + tag + '] ' + preview);
  }
}
