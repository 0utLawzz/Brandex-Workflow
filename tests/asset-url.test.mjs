import test from 'node:test';
import assert from 'node:assert/strict';
import { caseLogoSource, safeAssetHref } from '../lib/asset-url.ts';
import { copyBackupAssets } from '../lib/backup-assets.ts';
import { planAssetRestore, remapAssetUrls } from '../lib/restore-assets.ts';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('opaque Drive IDs use authenticated case previews while links use canonical Drive URLs', () => {
  const id='1234567890ABCDEFGHIJKLMNO';
  assert.equal(caseLogoSource(5,id),'/api/case-image?recordId=5');
  assert.equal(caseLogoSource(5,`https://drive.google.com/file/d/${id}/view`),'/api/case-image?recordId=5');
  assert.equal(safeAssetHref(id),`https://drive.google.com/file/d/${id}/view`);
  assert.equal(caseLogoSource(5,'data:image/png;base64,QUJD'),'data:image/png;base64,QUJD');
  for (const value of ['javascript:alert(1)','http://example.com/file','data:text/html;base64,QUJD','data:image/svg+xml;base64,QUJD','https://user:pass@example.com/file']) {
    assert.equal(safeAssetHref(value),''); assert.equal(caseLogoSource(5,value),'');
  }
  assert.equal(caseLogoSource(5,'data:application/pdf;base64,QUJD'),'');
});
test('backup and recovery preserve raw Drive-ID provenance and remap it to the verified copy', async () => {
  const id='1234567890ABCDEFGHIJKLMNO';
  const asset={assetId:'logo',sourceUrl:id,fileName:'original.png'};
  const copies=await copyBackupAssets([asset],async fileId=>{
    assert.equal(fileId,id);
    return {dataUrl:'data:text/plain;base64,dGVzdA==',sha256:'9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'};
  });
  const plan=await planAssetRestore([asset],copies);
  assert.equal(plan.missing,0); assert.equal(plan.uploads[0].sourceUrl,id);
  const restored=remapAssetUrls({records:[{logo_url:id}]},new Map([[id,{url:'https://drive.google.com/file/d/copied/view',mimeType:'image/png'}]]));
  assert.equal(restored.records[0].logo_url,'https://drive.google.com/file/d/copied/view');
});
test('Apps Script thumbnails retain original files and reject non-raster or oversized previews', async () => {
  const code=await readFile(new URL('../Code.gs',import.meta.url),'utf8');
  let mime='image/png'; let size=3; let thumbnail=true; let blobReads=0;
  const blob={getContentType:()=>mime,getBytes:()=>Array(size).fill(1)};
  const context=vm.createContext({DriveApp:{getFileById:()=>({isTrashed:()=>false,getMimeType:()=>mime,getSize:()=>size,getThumbnail:()=>thumbnail?blob:null,getBlob:()=>{blobReads++;return blob;}})},Utilities:{base64Encode:bytes=>Buffer.from(bytes).toString('base64')}});
  vm.runInContext(code,context);
  assert.equal(context.getImageThumbnail('1234567890').dataUrl,'data:image/png;base64,AQEB');
  assert.equal(blobReads,0);
  thumbnail=false;
  assert.equal(context.getImageThumbnail('1234567890').ok,true); assert.equal(blobReads,1);
  mime='image/svg+xml'; assert.throws(()=>context.getImageThumbnail('1234567890'),/Image unavailable/);
  mime='image/png'; size=1024*1024+1;
  assert.throws(()=>context.getImageThumbnail('1234567890'),/No supported thumbnail/);
});
