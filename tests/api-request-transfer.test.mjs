import test from 'node:test';
import assert from 'node:assert/strict';
import { requestWithTransfer } from '../lib/api-request-client.ts';
import { applicationTarget, validateApiOutcome } from '../lib/api-request-transfer.ts';
import { RECOVERY_CHUNK_BYTES, assembleRecovery, encodeRecoveryChunk, recoveryDigest } from '../lib/recovery-transfer.ts';

test('large Unicode application input/output crosses only bounded HTTP chunks and executes once', async () => {
  const previous=globalThis.fetch;
  const notes='الف'.repeat(900000);
  const payload={operation:'updateRecordWithHistory',id:1,updates:{notes},auditNote:'Edited'};
  const chunks=new Map(); const progress=[];
  let manifest; let executions=0; let releases=0;
  globalThis.fetch=async (url,options)=>{
    assert.equal(url,'/api/request-transfer');
    assert.ok(new TextEncoder().encode(options.body).length<750*1024);
    const body=JSON.parse(options.body);
    let result=true;
    if(body.operation==='start') {
      assert.equal(body.target,'database');
      manifest={id:crypto.randomUUID(),byteLength:body.byteLength,chunkCount:body.chunkCount,sha256:body.sha256}; result=manifest;
    } else if(body.operation==='put') chunks.set(body.index,body.content);
    else if(body.operation==='execute') {
      const original=JSON.parse(await assembleRecovery(manifest,async index=>chunks.get(index)));
      assert.deepEqual(original,payload); executions++;
      const output=new TextEncoder().encode(JSON.stringify({ok:true,result:{id:1,notes}}));
      manifest={id:manifest.id,byteLength:output.length,chunkCount:Math.ceil(output.length/RECOVERY_CHUNK_BYTES),sha256:await recoveryDigest(output)};
      chunks.clear();
      for(let index=0;index<manifest.chunkCount;index++) chunks.set(index,encodeRecoveryChunk(output.subarray(index*RECOVERY_CHUNK_BYTES,(index+1)*RECOVERY_CHUNK_BYTES)));
      result={status:200,manifest};
    } else if(body.operation==='get') result=chunks.get(body.index);
    else if(body.operation==='release') releases++;
    else assert.fail(body.operation);
    return Response.json({ok:true,result});
  };
  try {
    const response=await requestWithTransfer('/api/database',payload,value=>progress.push(value));
    assert.equal((await response.json()).result.notes,notes);
    assert.equal(executions,1); assert.equal(releases,1);
    assert.ok(progress.filter(value=>value.phase==='upload').length>1);
    assert.ok(progress.filter(value=>value.phase==='download').length>1);
  } finally { globalThis.fetch=previous; }
});

test('transport preserves ordinary API errors and rejects unsupported targets', async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async (_url,options)=>{
    const body=JSON.parse(options.body); assert.equal(body.operation,'invoke');
    return Response.json({ok:true,result:{status:409,text:JSON.stringify({ok:false,error:'Duplicate case identity'})}});
  };
  try {
    const response=await requestWithTransfer('/api/database',{operation:'addRecord',record:{}});
    assert.equal(response.status,409); assert.equal((await response.json()).error,'Duplicate case identity');
    await assert.rejects(requestWithTransfer('/api/auth/login',{}),/Invalid application request endpoint/);
    assert.throws(()=>applicationTarget('arbitrary-url'),/Invalid/);
    assert.throws(()=>validateApiOutcome({status:200,text:'one',manifest:{}}),/not captured/);
  } finally {globalThis.fetch=previous;}
});

test('uncertain execution checks the same captured outcome and never replays the operation',async()=>{
  const previous=globalThis.fetch;
  const payload={operation:'updateRecordWithHistory',updates:{notes:'x'.repeat(300000)}};
  let id; let executions=0; let checks=0; let ready=true;
  globalThis.fetch=async (_url,options)=>{
    const body=JSON.parse(options.body); let result=true;
    if(body.operation==='start'){id=crypto.randomUUID();result={id,byteLength:body.byteLength,chunkCount:body.chunkCount,sha256:body.sha256};}
    else if(body.operation==='execute'){executions++;throw new TypeError('Connection closed after commit');}
    else if(body.operation==='status'){assert.equal(body.id,id);checks++;result=ready?{status:200,text:'{"ok":true,"result":1}'}:{state:'executing'};}
    else assert.ok(['put','release'].includes(body.operation));
    return Response.json({ok:true,result});
  };
  try {
    assert.equal((await (await requestWithTransfer('/api/database',payload)).json()).result,1);
    assert.equal(executions,1); assert.equal(checks,1);
    ready=false;
    await assert.rejects(requestWithTransfer('/api/database',payload),/may already have completed/);
    assert.equal(executions,2); assert.equal(checks,2);
  } finally{globalThis.fetch=previous;}
});
