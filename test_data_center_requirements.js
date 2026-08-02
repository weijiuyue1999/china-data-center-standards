const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const documentsSource = html.match(/const documents = (\[(?:.|\r|\n)*?\n    \]);/)[1];
const requirementsSource = html.match(/const requirements = (\[(?:.|\r|\n)*?\n\]);/)[1];
const documents = vm.runInNewContext(documentsSource);
const requirements = JSON.parse(requirementsSource);
const docMap = Object.fromEntries(documents.map((doc) => [doc.id, doc]));

const core = ['gb50174', 'gbt44989', 'gbt33136', 'gbt43331', 'gb40879', 'gb50462', 'gbt2887', 'gbt9361'];
for (const id of core) {
  const count = requirements.filter((row) => row.doc === id).length;
  if (!count) throw new Error(`${id} has no requirement records`);
}

const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, '');
const aliases = {
  '温湿度': ['温湿度', '温度', '湿度', '露点'],
  '荷载': ['荷载', '荷重'],
  'pue': ['pue', '电能比'],
  '消防': ['消防', '防火', '灭火', '疏散'],
  '施工验收': ['施工验收', '综合测试', '竣工验收']
};
const search = (query) => requirements.filter((row) => {
  const doc = docMap[row.doc] || {};
  const haystack = normalize([
    row.metric, row.profession, row.object, row.condition, row.value, row.unit,
    row.rule, row.note, row.ref, doc.code, doc.name
  ].join(' '));
  return normalize(query).split(/[，,、;；]+/).filter(Boolean).every((term) => {
    const candidates = aliases[term] || [term];
    return candidates.some((candidate) => haystack.includes(candidate));
  });
});

for (const query of ['荷载', '净高', 'PUE', '消防', '温湿度', '施工验收', '成熟度']) {
  const rows = search(query);
  if (!rows.length) throw new Error(`${query} returned no rows`);
  console.log(`${query}: ${rows.length} rows / ${new Set(rows.map((row) => row.doc)).size} standards`);
}

const pue115 = search('1.15');
if (!pue115.some((row) => row.doc === 'gbt44989' && row.note.includes('不是强制门槛'))) {
  throw new Error('PUE 1.15 interpretation record is missing');
}

console.log(`documents=${documents.length}, requirements=${requirements.length}, coreStandards=${core.length}`);
