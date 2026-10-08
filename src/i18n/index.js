import en from './en.json';
import fil from './fil.json';

let language = 'en';
const catalogs = { en, fil };
export const getLanguage = () => language;
export function setLanguage(value) {
  language = value === 'fil' ? 'fil' : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}
export function t(key, values = {}) {
  const text = catalogs[language][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    const value = String(values[name] ?? match);
    return catalogs[language][value] ?? value;
  });
}
const patterns = Object.entries(en)
  .filter(([, text]) => typeof text === 'string' && text.includes('{'))
  .map(([key, text]) => {
    const names = [];
    const parts = text.split(/(\{\w+\})/g).map((part) => {
      if (/^\{\w+\}$/.test(part)) {
        names.push(part.slice(1, -1));
        return '(.+?)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    return { key, names, regex: new RegExp(`^${parts.join('')}$`) };
  });
/** Translate engine presentation text without changing scientific IDs or UTC. */
export function phrase(value) {
  const text = String(value ?? '');
  const trimmed = text.trim();
  if (!trimmed) return text;
  let translated = catalogs[language][trimmed];
  if (translated == null) {
    for (const pattern of patterns) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        translated = t(
          pattern.key,
          Object.fromEntries(
            pattern.names.map((name, i) => [name, match[i + 1]]),
          ),
        );
        break;
      }
    }
  }
  if (translated == null && language !== 'en') {
    // A journal story can join two catalog messages (story + chosen response).
    let joined = text;
    for (const [key, english] of Object.entries(en)) {
      if (
        english.length >= 8 &&
        !english.includes('{') &&
        joined.includes(english)
      )
        joined = joined.replaceAll(english, catalogs[language][key] ?? english);
    }
    return joined;
  }
  return translated == null ? text : text.replace(trimmed, translated);
}
/** Existing journal/map DOM uses the same catalogs as the new menus. */
export function localize(root) {
  if (language === 'en') return;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const node = walk.currentNode;
    if (!['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName))
      node.textContent = phrase(node.textContent);
  }
  for (const element of [
    root,
    ...root.querySelectorAll(
      '[aria-label], [aria-valuetext], [title], [placeholder]',
    ),
  ]) {
    for (const attr of [
      'aria-label',
      'aria-valuetext',
      'title',
      'placeholder',
    ]) {
      if (element.hasAttribute(attr))
        element.setAttribute(attr, phrase(element.getAttribute(attr)));
    }
  }
}
