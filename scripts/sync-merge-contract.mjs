import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const contractSource = await readFile(new URL('lib/merge-contract.ts', root), 'utf8');
const fields = JSON.parse(contractSource.match(/CASE_MERGE_FIELDS = (\[[\s\S]*?\]) as const/)[1]);
const path = new URL('Code.gs', root);
const original = await readFile(path, 'utf8');
const block = `// BEGIN GENERATED MERGE CONTRACT\nvar CASE_MERGE_FIELDS = ${JSON.stringify(fields)};\nfunction buildCanonicalMergeData(row) {\n  var result = {};\n  CASE_MERGE_FIELDS.forEach(function(field) {\n    var value = row[field.api];\n    if (value === undefined) value = row[field.record];\n    result['{{' + field.tag + '}}'] = value === undefined || value === null ? '' : String(value);\n  });\n  return result;\n}\n// END GENERATED MERGE CONTRACT`;
let updated = original.replace(/  var mergeData = \{[\s\S]*?\n  \};/g, '  var mergeData = buildCanonicalMergeData(rowData);');
const marker = /\/\/ BEGIN GENERATED MERGE CONTRACT[\s\S]*?\/\/ END GENERATED MERGE CONTRACT/;
updated = marker.test(updated) ? updated.replace(marker, block) : `${updated.trimEnd()}\n\n${block}\n`;
if (process.argv.includes('--check')) {
  if (updated.replaceAll('\r\n', '\n') !== original.replaceAll('\r\n', '\n')) throw new Error('Run node scripts/sync-merge-contract.mjs and commit the generated Apps Script contract.');
} else await writeFile(path, updated);
