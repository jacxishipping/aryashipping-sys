// ONE-SHOT codemod: MUI TextField -> DS FormField. Run with node. Deletes after use.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:\\Users\\RDP\\Documents\\GitHub\\aryashipping-sys';
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function isEscaped(s, idx) {
  let n = 0, j = idx - 1;
  while (j >= 0 && s[j] === '\\') { n++; j--; }
  return n % 2 === 1;
}

// Blank out string literals (keep length) for safe regex tests.
function blankStrings(s) {
  let out = '', str = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (str) { out += c === '\n' ? '\n' : ' '; if (c === str && !isEscaped(s, i)) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; out += ' '; continue; }
    out += c;
  }
  return out;
}

// Find element starting at '<TextField' idx. Returns header/body spans or null.
function scanElement(src, start) {
  let i = start + '<TextField'.length;
  let depth = 0, str = null, lineC = false, blockC = false;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (lineC) { if (c === '\n') lineC = false; continue; }
    if (blockC) { if (c === '*' && n === '/') { blockC = false; i++; } continue; }
    if (str) { if (c === str && !isEscaped(src, i)) str = null; continue; }
    if (c === '/' && n === '/') { lineC = true; i++; continue; }
    if (c === '/' && n === '*') { blockC = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; continue; }
    if (depth === 0 && c === '>') {
      const selfClosing = src[i - 1] === '/';
      const headerEnd = i + 1;
      if (selfClosing) return { headerStart: start, headerEnd, selfClosing: true, end: headerEnd };
      const closeIdx = src.indexOf('</TextField>', headerEnd);
      if (closeIdx === -1) return null;
      return { headerStart: start, headerEnd, selfClosing: false, end: closeIdx + '</TextField>'.length };
    }
  }
  return null;
}

// Extract balanced {...} starting at openIdx (at '{'). Returns {inner, end} or null.
function extractBraced(s, openIdx) {
  let depth = 0, str = null;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (str) { if (c === str && !isEscaped(s, i)) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) return { inner: s.slice(openIdx + 1, i), end: i + 1 }; }
  }
  return null;
}

// True if `name` appears as a top-level (depth-0) JSX prop, ignoring nested JSX/strings.
function hasTopLevelProp(header, name) {
  let depth = 0, str = null;
  for (let i = 0; i < header.length; i++) {
    const c = header[i];
    if (str) { if (c === str && !isEscaped(header, i)) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; continue; }
    if (depth === 0 && /[\s]/.test(c)) {
      const rest = header.slice(i + 1);
      const m = new RegExp('^' + name + '(\\s*=|\\s|\\/|>)').exec(rest);
      if (m) return true;
    }
  }
  return false;
}

// Extract top-level `name={...}` value inner text. Null if absent/unparseable.
function topLevelBraced(header, name) {
  let depth = 0, str = null;
  for (let i = 0; i < header.length; i++) {
    const c = header[i];
    if (str) { if (c === str && !isEscaped(header, i)) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; continue; }
    if (depth === 0 && /[\s]/.test(c)) {
      const rest = header.slice(i + 1);
      const m = new RegExp('^' + name + '\\s*=\\s*\\{').exec(rest);
      if (m) {
        const openIdx = i + 1 + m[0].length - 1;
        const ex = extractBraced(header, openIdx);
        return ex ? { inner: ex.inner, start: i, end: ex.end } : null;
      }
    }
  }
  return null;
}

// Split on top-level delimiter.
function splitTop(s, delim) {
  const parts = [];
  let depth = 0, str = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (str) { cur += c; if (c === str && !isEscaped(s, i)) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; cur += c; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    if (c === '}' || c === ')' || c === ']') depth--;
    if (c === delim && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() !== '') parts.push(cur);
  return parts;
}

function stripParens(v) {
  v = v.trim();
  while (v.startsWith('(') && v.endsWith(')')) {
    // verify balanced outer parens
    let depth = 0, ok = true;
    for (let i = 0; i < v.length; i++) {
      if (v[i] === '(') depth++;
      if (v[i] === ')') { depth--; if (depth === 0 && i < v.length - 1) { ok = false; break; } }
    }
    if (!ok || depth !== 0) break;
    v = v.slice(1, -1).trim();
  }
  return v;
}

function unwrapAdornment(v) {
  v = stripParens(v);
  const m = v.match(/^<InputAdornment(\s[^>]*)?>/);
  if (!m) return v;
  const innerStart = m[0].length;
  const closeIdx = v.lastIndexOf('</InputAdornment>');
  if (closeIdx === -1) return v;
  return v.slice(innerStart, closeIdx).trim();
}

// Remove a `name={...}` or `name="..."` or bare `name` prop from header. Returns new header or null.
function removeProp(header, name) {
  const blank = blankStrings(header);
  const re = new RegExp('\\b' + name + '\\b(\\s*=)?');
  const m = re.exec(blank);
  if (!m) return header;
  // Walk back over REAL whitespace only (blanked string positions look like ws).
  let start = m.index;
  while (start > 0 && /\s/.test(header[start - 1])) start--;
  let end = m.index + m[0].length;
  const rest = header.slice(end).trimStart();
  const leadWs = header.slice(end, end + (header.slice(end).length - rest.length));
  if (m[1]) {
    const valStart = end + leadWs.length;
    const first = header[valStart];
    if (first === '{') {
      const ex = extractBraced(header, valStart);
      if (!ex) return null;
      end = ex.end;
    } else if (first === '"' || first === "'") {
      let i = valStart + 1;
      while (i < header.length && !(header[i] === first && !isEscaped(header, i))) i++;
      end = i + 1;
    } else {
      const mm = /^[^\s/>]+/.exec(header.slice(valStart));
      end = valStart + (mm ? mm[0].length : 0);
    }
  }
  return header.slice(0, start) + header.slice(end);
}

function getPropBraced(header, name) {
  const re = new RegExp('(\\s+)' + name + '\\s*=\\s*\\{');
  const m = re.exec(header);
  if (!m) return null;
  const openIdx = m.index + m[0].length - 1;
  const ex = extractBraced(header, openIdx);
  if (!ex) return null;
  return { inner: ex.inner, start: m.index, end: ex.end };
}

const files = walk(SRC).filter((f) => {
  const c = fs.readFileSync(f, 'utf8');
  return /<TextField\b/.test(c);
});

const report = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  let content = fs.readFileSync(file, 'utf8');
  let converted = 0, skipped = 0;
  const flags = new Set();
  // iterate occurrences (re-scan after each edit)
  for (;;) {
    const idx = content.search(/<TextField\b/);
    if (idx === -1) break;
    const el = scanElement(content, idx);
    if (!el) { flags.add('parse-fail'); break; }
    let header = content.slice(el.headerStart, el.headerEnd);
    const blank = blankStrings(header);
    // To continue scanning past a skipped element, temporarily mask it.
    const maskAndContinue = (flag) => {
      flags.add(flag); skipped++;
      content = content.slice(0, idx + 1) + '\u0000TextField' + content.slice(idx + 1 + 'TextField'.length);
    };
    if (!el.selfClosing) { maskAndContinue('has-children'); continue; }
    if (hasTopLevelProp(header, 'select')) { maskAndContinue('select-prop'); continue; }
    if (hasTopLevelProp(header, 'variant')) { maskAndContinue('variant-prop'); continue; }
    if (hasTopLevelProp(header, 'SelectProps') || hasTopLevelProp(header, 'FormHelperTextProps') || hasTopLevelProp(header, 'slotProps')) { maskAndContinue('exotic-props'); continue; }
    // Top-level sx: drop if it only restates FormField defaults, else skip for hand conversion.
    const sxTop = topLevelBraced(header, 'sx');
    if (sxTop) {
      const inner = sxTop.inner;
      const hasLayout = /(\bmb\b|\bmt\b|\bml\b|\bmr\b|\bm\b|\bp\b|width|grid|flex|display|position|margin|padding|gap|height|transform)/.test(blankStrings(inner));
      const onlyMuiInternals = /MuiOutlinedInput-root|MuiInputLabel-root|MuiSelect|fieldset/.test(inner) || /bgcolor|backgroundColor|borderRadius|borderColor/.test(inner);
      if (hasLayout || !onlyMuiInternals) { maskAndContinue('sx-prop'); continue; }
      header = header.slice(0, sxTop.start) + ' ' + header.slice(sxTop.end);
      flags.add('sx-dropped');
    }
    // spreads
    const spreads = [...header.matchAll(/\{\.\.\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
    if (spreads.some((s) => s !== 'register' && s !== 'field')) { maskAndContinue('spread:' + spreads.join(',')); continue; }
    // InputLabelProps -> drop
    header = removeProp(header, 'InputLabelProps');
    // inputProps={{...}} -> splice attrs
    const ip = getPropBraced(header, 'inputProps');
    if (ip) {
      const innerEx = extractBraced(header, header.indexOf('{', ip.start));
      // innerEx.inner is "{ min: 1 }" (object literal incl braces) — unwrap one level
      const objStart = innerEx.inner.search(/\{/);
      if (objStart === -1) { maskAndContinue('inputProps-nonliteral'); continue; }
      const objEx = extractBraced(innerEx.inner, objStart);
      const pairs = splitTop(objEx.inner, ',');
      const attrs = [];
      let bad = false;
      for (const p of pairs) {
        const pm = /^\s*([A-Za-z_$][\w$]*)\s*:\s*([\s\S]*)$/.exec(p.trim());
        if (!pm) { bad = true; break; }
        attrs.push(`${pm[1]}={${pm[2].trim()}}`);
      }
      if (bad) { maskAndContinue('inputProps-complex'); continue; }
      header = header.slice(0, ip.start) + ' ' + attrs.join(' ') + ' ' + header.slice(ip.end);
    }
    // InputProps={{...}} -> leftIcon/rightIcon/readOnly/disabled
    const IP = getPropBraced(header, 'InputProps');
    if (IP) {
      const innerEx = extractBraced(header, header.indexOf('{', IP.start));
      const objStart = innerEx.inner.search(/\{/);
      if (objStart === -1) { maskAndContinue('InputProps-nonliteral'); continue; }
      const objEx = extractBraced(innerEx.inner, objStart);
      const pairs = splitTop(objEx.inner, ',');
      const attrs = [];
      let bad = null;
      for (const p of pairs) {
        const t = p.trim();
        if (t.startsWith('...')) { bad = 'InputProps-spread'; break; }
        const pm = /^\s*([A-Za-z_$][\w$]*)\s*:\s*([\s\S]*)$/.exec(t);
        if (!pm) { bad = 'InputProps-complex'; break; }
        const k = pm[1], v = pm[2].trim();
        if (k === 'startAdornment') attrs.push(`leftIcon={${unwrapAdornment(v)}}`);
        else if (k === 'endAdornment') attrs.push(`rightIcon={${unwrapAdornment(v)}}`);
        else if (k === 'readOnly' || k === 'disabled') attrs.push(`${k}={${v}}`);
        else { bad = 'InputProps-key:' + k; break; }
      }
      if (bad) { maskAndContinue(bad); continue; }
      header = header.slice(0, IP.start) + ' ' + attrs.join(' ') + ' ' + header.slice(IP.end);
    }
    header = header.replace(/<TextField\b/, '<FormField');
    content = content.slice(0, el.headerStart) + header + content.slice(el.headerEnd);
    converted++;
  }
  content = content.replace(/\u0000TextField/g, 'TextField');
  // imports
  const stillTF = /<TextField\b/.test(content);
  const hasFF = /<FormField\b/.test(content);
  const usesAdorn = /<InputAdornment\b/.test(content);
  content = content.replace(
    /import\s*\{([^}]*)\}\s*from\s*'@mui\/material';?/g,
    (m, names) => {
      let list = names.split(',').map((s) => s.trim()).filter(Boolean);
      if (!stillTF) list = list.filter((n) => n !== 'TextField');
      if (!usesAdorn) list = list.filter((n) => n !== 'InputAdornment');
      if (list.length === 0) return '';
      return `import {\n${list.map((n) => '  ' + n).join(',\n')},\n} from '@mui/material';`;
    }
  );
  content = content.replace(/import\s+TextField\s+from\s*'@mui\/material\/TextField';?\r?\n?/g, '');
  if (hasFF && !/from\s*['"]@\/components\/design-system['"]/.test(content)) {
    const imps = [...content.matchAll(/^import[^\n]*\n/gm)];
    const anchor = imps.length ? imps[imps.length - 1] : null;
    const stmt = `import { FormField } from '@/components/design-system';\n`;
    content = anchor
      ? content.slice(0, anchor.index + anchor[0].length) + stmt + content.slice(anchor.index + anchor[0].length)
      : stmt + content;
  } else if (hasFF) {
    content = content.replace(/\}\s*from\s*['"]@\/components\/design-system['"]/, (m) => {
      const at = content.indexOf(m);
      const before = content.slice(0, at);
      const openIdx = before.lastIndexOf('{');
      const existing = before.slice(openIdx);
      if (/\bFormField\b/.test(existing)) return m;
      const hasTrailingComma = /,\s*$/.test(before);
      return (hasTrailingComma ? ' FormField ' : ', FormField ') + m;
    });
  }
  const original = fs.readFileSync(file, 'utf8');
  if (content !== original) fs.writeFileSync(file, content);
  report.push({ file: rel, converted, skipped, flags: [...flags] });
}

fs.writeFileSync(path.join(ROOT, 'codemod-report.json'), JSON.stringify(report, null, 1));
let c = 0, s = 0;
for (const f of report) { c += f.converted; s += f.skipped; }
console.log('CONVERTED:' + c + ' SKIPPED:' + s);
for (const f of report) {
  if (f.skipped > 0 || f.flags.length) console.log(f.file + ' conv=' + f.converted + ' skip=' + f.skipped + ' flags=' + f.flags.join(','));
}
