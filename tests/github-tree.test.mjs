import test from 'node:test';
import assert from 'node:assert/strict';
import {createTreeBatch} from '../scripts/github-tree.mjs';
test('large tree timeouts split entries and preserve earlier batches',async()=>{
  const trees=new Map([['initial',[]]]);
  let id=0;
  const request=async(endpoint,method,body)=>{
    assert.equal(method,'POST');assert.match(endpoint,/\/git\/trees$/);
    if(body.tree.length>1)throw new Error('input too large: timed out (HTTP 422)');
    const sha=String(++id);trees.set(sha,[...(trees.get(body.base_tree)||[]),...body.tree]);return {sha};
  };
  const entries=['a','b','c'].map(path=>({path,mode:'100644',type:'blob',content:path}));
  const result=await createTreeBatch('test/repo',entries,'initial',request);
  assert.deepEqual(trees.get(result),entries);
});
test('a single oversized inline file uses a blob and does not loop on other failures',async()=>{
  let blobs=0;
  const request=async(endpoint,method,body)=>{
    if(endpoint.endsWith('/blobs')) {blobs++;assert.equal(Buffer.from(body.content,'base64').toString(),'正文');return {sha:'blob'};}
    if(body.tree[0].content)throw new Error('timed out (HTTP 422)');
    assert.equal(body.tree[0].sha,'blob');return {sha:'tree'};
  };
  assert.equal(await createTreeBatch('test/repo',[{path:'article',content:'正文'}],null,request),'tree');
  assert.equal(blobs,1);
  let calls=0;
  await assert.rejects(createTreeBatch('test/repo',[{path:'a'}],null,async()=>{calls++;throw new Error('HTTP 403');}),/403/);
  assert.equal(calls,1);
});
