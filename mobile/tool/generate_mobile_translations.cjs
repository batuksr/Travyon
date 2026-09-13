const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const tr = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, 'web/src/i18n/locales/tr.json'),
  'utf8',
));
const en = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, 'web/src/i18n/locales/en.json'),
  'utf8',
));

const mobileLiterals = new Set();
const collectMobileLiterals = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'localization') collectMobileLiterals(target);
      continue;
    }
    if (!entry.name.endsWith('.dart') ||
        entry.name === 'onboarding_cities.dart' ||
        entry.name === 'hub_content.dart') continue;
    const source = fs.readFileSync(target, 'utf8');
    for (const match of source.matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
      mobileLiterals.add(match[1].replaceAll("\\'", "'"));
    }
  }
};
collectMobileLiterals(path.join(mobileRoot, 'lib'));

const pairs = new Map();
const visit = (trValue, enValue) => {
  if (typeof trValue === 'string' && typeof enValue === 'string') {
    if (mobileLiterals.has(trValue) && trValue !== enValue && !pairs.has(trValue)) {
      pairs.set(trValue, enValue);
    }
    return;
  }
  if (Array.isArray(trValue) && Array.isArray(enValue)) {
    trValue.forEach((value, index) => visit(value, enValue[index]));
    return;
  }
  if (!trValue || !enValue || typeof trValue !== 'object' || typeof enValue !== 'object') return;
  Object.keys(trValue).forEach(key => visit(trValue[key], enValue[key]));
};
visit(tr, en);

const quote = value => `'${value
  .replaceAll('\\', '\\\\')
  .replaceAll("'", "\\'")
  .replaceAll('\r', '\\r')
  .replaceAll('\n', '\\n')}'`;

const body = [...pairs.entries()]
  .sort(([left], [right]) => left.localeCompare(right, 'tr'))
  .map(([source, target]) => `  ${quote(source)}: ${quote(target)},`)
  .join('\n');

const output = `// GENERATED FILE. Run: node tool/generate_mobile_translations.cjs\n` +
  `// Source: web/src/i18n/locales/{tr,en}.json\n` +
  `// dart format off\n` +
  `const generatedEnglishTranslations = <String, String>{\n${body}\n};\n` +
  `// dart format on\n`;

fs.writeFileSync(
  path.join(mobileRoot, 'lib/core/localization/app_translations.generated.dart'),
  output,
  'utf8',
);

const decodeDartString = value => value
  .replaceAll("\\'", "'")
  .replaceAll('\\n', '\n')
  .replaceAll('\\r', '\r')
  .replaceAll('\\\\', '\\');
const manualSource = fs.readFileSync(
  path.join(mobileRoot, 'lib/core/localization/app_translations.dart'),
  'utf8',
);
const manualKeys = new Set(
  [...manualSource.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)]
    .map(match => decodeDartString(match[1])),
);
const translated = new Set([...pairs.keys(), ...manualKeys]);
const visibleLiterals = new Set();
const scan = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(target);
    if (!entry.isFile() || !entry.name.endsWith('.dart')) continue;
    const source = fs.readFileSync(target, 'utf8');
    for (const match of source.matchAll(/(?:const\s+)?Text\(\s*'((?:[^'\\]|\\.)*)'/g)) {
      const value = decodeDartString(match[1]);
      if (/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value)) visibleLiterals.add(value);
    }
  }
};
scan(path.join(mobileRoot, 'lib/features'));
const missing = [...visibleLiterals].filter(value => !translated.has(value)).sort();
console.log(
  `Generated ${pairs.size} shared translations; ` +
  `${visibleLiterals.size - missing.length}/${visibleLiterals.size} direct Text literals covered.`,
);
if (missing.length) console.log(`Missing direct literals:\n${missing.join('\n')}`);
