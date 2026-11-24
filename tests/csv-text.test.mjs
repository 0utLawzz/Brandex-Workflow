import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { CSV_ENCODING_HEADER, CSV_TEXT_ENCODING, encodeCsvText, decodeCsvText, csvRowIsEncoded } from '../lib/csv-text.ts';

test('formula guards are reversible for dangerous prefixes, whitespace, phone numbers and original apostrophes', () => {
  for (const value of ['=1+1','+923001234567','-10','@SUM(A1)',' =1+1','\tvalue','\rvalue',"'original", "'=original",'ordinary']) {
    const encoded = encodeCsvText(value);
    assert.equal(decodeCsvText(encoded,true),value);
    if (value !== 'ordinary') assert.ok(encoded.startsWith("'"));
  }
  assert.equal(decodeCsvText("'=1+1",false),"'=1+1");
  assert.equal(csvRowIsEncoded(CSV_TEXT_ENCODING),true);
  assert.throws(()=>csvRowIsEncoded('unknown'),/Unsupported CSV text encoding/);
});
test('case and client exports guard spreadsheet formulas while reimport retains text and contact identity', async () => {
  globalThis.window = {};
  const { standaloneDB } = await import('../lib/standalone-db.ts');
  const csv=standaloneDB.exportRecordsCSV([{id:1,selectionMenu:'N',clientCode:'003',caseNo:'001',folder:'CASE',appName:'PERSON',notes:'=HYPERLINK("https://evil.test")'}]);
  const raw=Papa.parse(csv,{header:true}).data[0];
  assert.equal(raw[CSV_ENCODING_HEADER],CSV_TEXT_ENCODING);
  assert.equal(raw.Notes,"'=HYPERLINK(\"https://evil.test\")");
  assert.equal(standaloneDB.importRecordsCSV(csv,false).records[0].notes,'=HYPERLINK("https://evil.test")');
  const clientCsv=standaloneDB.exportClientsCSV([{id:1,client_code:'003',client_name:'PERSON',phone:'+92 300 1234567',email:'staff@example.com',father_name:"'ORIGINAL"}]);
  const result=standaloneDB.importClientsCSV(clientCsv,false);
  assert.equal(result.success,true); assert.equal(result.clients[0].phone,'+92 300 1234567');
  assert.equal(result.clients[0].father_name,"'ORIGINAL");
});
