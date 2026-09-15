// The web locale files are the source of truth for public help/legal content.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const locales = Object.fromEntries(['tr', 'en'].map(language => {
  const source = JSON.parse(fs.readFileSync(
    path.join(root, `web/src/i18n/locales/${language}.json`), 'utf8',
  )).legal;
  for (const section of ['faq', 'privacy', 'terms', 'contact']) {
    if (!source?.[section]?.title) throw new Error(`Missing ${language}.${section}`);
  }
  return [language, source];
}));
const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  }
  if (typeof value !== 'string' || !value.trim()) throw new Error('Empty/non-string help content');
  return 'string';
};
if (JSON.stringify(shape(locales.tr)) !== JSON.stringify(shape(locales.en))) {
  throw new Error('Turkish and English help content must have matching sections and questions.');
}
const target = path.join(root, 'mobile/lib/features/help/data/help_content.generated.dart');
const output = '// GENERATED. Run: node mobile/tool/sync_help_content.cjs\n' +
  '// Source: web/src/i18n/locales/{tr,en}.json — legal. Do not edit by hand.\n' +
  '// dart format off\n' +
  'const sharedHelpContent = <String, Map<String, dynamic>>' +
  JSON.stringify(locales, null, 2).replaceAll('$', '\\$') + ';\n' +
  '// dart format on\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== output) {
    throw new Error('Mobile help content is out of date. Run: node mobile/tool/sync_help_content.cjs');
  }
  console.log('Mobile/web help content matches in Turkish and English.');
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
  console.log('Synced all FAQ, privacy, terms and contact content for Turkish and English.');
}
