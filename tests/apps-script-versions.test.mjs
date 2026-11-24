import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const code=await readFile(new URL('../Code.gs',import.meta.url),'utf8');

function fixture() {
  const files=[]; let opened=0; let stamp='2026-11-24T00:00:00Z'; let failSave=false;
  // A real Apps Script Blob.setName returns that same Blob.
  const makeBlob=(data,mime='text/plain',name='')=>{
    const result={getBytes:()=>Array.from(Buffer.from(data)),getContentType:()=>mime,getName:()=>name,setName:value=>{name=value;return result;}};
    return result;
  };
  const makeFile=(name,mime,bytes=Buffer.alloc(0),body='')=>{
    const file={id:`file-${files.length+1}`,name,mime,bytes:Buffer.from(bytes),body,description:'',getId(){return this.id;},getName(){return this.name;},getUrl(){return `https://drive.google.com/file/d/${this.id}/view`;},getMimeType(){return this.mime;},getSize(){return this.bytes.length;},getBlob(){return makeBlob(this.bytes,this.mime,this.name);},getDescription(){return this.description;},setDescription(value){this.description=value;}};
    files.push(file); return file;
  };
  const iterator=items=>{let index=0;return {hasNext:()=>index<items.length,next:()=>items[index++]};};
  const folder={getFilesByName:name=>iterator(files.filter(file=>file.name===name)),createFile:input=>makeFile(input.getName(),input.getContentType(),input.getBytes())};
  const template={getLastUpdated:()=>new Date(stamp),makeCopy:name=>makeFile(name,'application/vnd.google-apps.document',[], '{{APP_NAME}}|{{IMAGE}}')};
  const context=vm.createContext({
    DriveApp:{getFileById:id=>id==='template'?template:files.find(file=>file.id===id)},
    DocumentApp:{openById:id=>{opened++;const file=files.find(file=>file.id===id);return {getBody:()=>({replaceText:(pattern,replacement)=>{file.body=file.body.replace(new RegExp(pattern,'g'),()=>replacement);}}),saveAndClose:()=>{if(failSave){failSave=false;throw new Error('temporary save failure');}}};}},
    Utilities:{newBlob:makeBlob,DigestAlgorithm:{SHA_256:'SHA_256'},computeDigest:(_algorithm,bytes)=>Array.from(createHash('sha256').update(Buffer.from(bytes)).digest())}
  });
  vm.runInContext(code,context);
  return {context,files,folder,makeFile,makeBlob,opened:()=>opened,setStamp:value=>{stamp=value;},failNextSave:()=>{failSave=true;}};
}
test('unchanged completed output is reused; changed fields/template create fresh versions without overwriting prior documents',()=>{
  const f=fixture();
  const generate=data=>f.context.generateWordDocReturn('template',f.folder,'Case - TM-1',data,null,'{{IMAGE}}','No logo','TM1');
  const first=generate({'{{APP_NAME}}':'ORIGINAL','{{UPDATED_AT}}':'first'});
  assert.equal(first.body,'ORIGINAL|No logo'); assert.equal(f.opened(),1);
  assert.equal(generate({'{{UPDATED_AT}}':'bookkeeping only','{{APP_NAME}}':'ORIGINAL'}).id,first.id);
  assert.equal(f.opened(),1);
  const edited=generate({'{{APP_NAME}}':'EDITED','{{UPDATED_AT}}':'changed'});
  assert.notEqual(edited.id,first.id); assert.equal(edited.name,'Case - TM-1 (2)');
  assert.equal(edited.body,'EDITED|No logo'); assert.equal(first.body,'ORIGINAL|No logo');
  f.setStamp('2026-11-25T00:00:00Z');
  assert.notEqual(generate({'{{APP_NAME}}':'EDITED','{{UPDATED_AT}}':'changed'}).id,edited.id);
  assert.equal(f.files.length,3);
});
test('legacy/failed documents are preserved and ambiguous duplicate names stop before changing files',()=>{
  const f=fixture();
  const legacy=f.makeFile('Legacy - TM-1','application/vnd.google-apps.document',[],'MANUAL CONTENT');
  const created=f.context.generateWordDocReturn('template',f.folder,'Legacy - TM-1',{'{{APP_NAME}}':'NEW'},null,'{{IMAGE}}','','TM1');
  assert.equal(created.name,'Legacy - TM-1 (2)'); assert.equal(legacy.body,'MANUAL CONTENT');
  f.failNextSave();
  assert.throws(()=>f.context.generateWordDocReturn('template',f.folder,'Failed',{'{{APP_NAME}}':'RETRY'},null,'{{IMAGE}}','','TM1'),/temporary save/);
  const retried=f.context.generateWordDocReturn('template',f.folder,'Failed',{'{{APP_NAME}}':'RETRY'},null,'{{IMAGE}}','','TM1');
  assert.equal(retried.name,'Failed (2)'); assert.equal(retried.body,'RETRY|[NO IMAGE PROVIDED]');
  f.makeFile('Ambiguous','application/vnd.google-apps.document'); f.makeFile('Ambiguous','application/vnd.google-apps.document');
  const count=f.files.length;
  assert.throws(()=>f.context.generateWordDocReturn('template',f.folder,'Ambiguous',{},null,'{{IMAGE}}','','TM1'),/Multiple files/);
  assert.equal(f.files.length,count);
});
test('logo/attachment retries compare actual bytes and MIME; replacement retains the original file and name',()=>{
  const f=fixture();
  const first=f.context.saveVersionedBlob(f.folder,'Original Logo.png',f.makeBlob('one','image/png'));
  assert.equal(f.context.saveVersionedBlob(f.folder,'Original Logo.png',f.makeBlob('one','image/png')).id,first.id);
  const changed=f.context.saveVersionedBlob(f.folder,'Original Logo.png',f.makeBlob('two','image/png'));
  assert.equal(changed.name,'Original Logo (2).png'); assert.equal(first.bytes.toString(),'one');
  assert.notEqual(f.context.saveVersionedBlob(f.folder,'Original Logo.png',f.makeBlob('one','image/jpeg')).id,first.id);
  first.bytes=Buffer.from('manually edited');
  assert.notEqual(f.context.saveVersionedBlob(f.folder,'Original Logo.png',f.makeBlob('one','image/png')).id,first.id);
  assert.equal(first.bytes.toString(),'manually edited');
});
