import test from 'node:test';
import assert from 'node:assert/strict';
import {assess,makePHP,validateEndpoint,validateSnapshot,FIXES} from '../../../php2shell-audit/engine.js';
for(const [branch,patch] of Object.entries(FIXES)){
 test(branch+' distinguishes before, at and after official fix',()=>{
  assert.equal(assess(branch+'.'+(patch-1)).status,'update');
  assert.equal(assess(branch+'.'+patch).status,'patched');
  assert.equal(assess(branch+'.'+(patch+1)).status,'patched');
 });
}
test('vendor backports are declarations, not automatic confirmations',()=>{
 assert.equal(assess('8.3.6-0ubuntu0.24.04.8','live','vendor bulletin').status,'backport');
 assert.equal(assess('8.3.6-0ubuntu0.24.04.8').status,'update');
 assert.equal(assess('8.1.33').status,'legacy');
 assert.equal(assess('8.1.33','manual','vendor bulletin').status,'backport');
});
test('missing, unsupported and prerelease versions never show patched',()=>{
 for(const v of ['','n/d','8.3','8.6.1','9.0.0','8.4.27-dev','8.5.12RC1'])assert.equal(assess(v).status,'unknown',v);
});
test('HTTPS endpoint cannot smuggle credentials, query or redirect token',()=>{
 assert.equal(validateEndpoint('https://example.com/path/audit.php').hostname,'example.com');
 for(const u of ['http://example.com/a.php','https://u:p@example.com/a.php','https://example.com/a.php?token=secret','https://example.com/a.php#x','https://example.com:8080/a.php','javascript:alert(1)'])assert.throws(()=>validateEndpoint(u));
});
const fixture={schema:'php2shell-runtime/1',observed_at:'2026-10-22T13:00:00Z',nonce:'a'.repeat(32),runtime:{php_version:'8.3.36',sapi:'fpm-fcgi',os:'Linux'},config:{memory_limit:'128M','session.upload_progress.enabled':'0',password:'discard'}};
test('import whitelists fields and excludes extraneous data',()=>{
 const clean=validateSnapshot({...fixture,secret:'discard'});assert.equal(clean.runtime.php_version,'8.3.36');assert.ok(!('password' in clean.config));assert.ok(!('secret' in clean));
});
test('import rejects invalid schema and oversized or non-scalar fields',()=>{
 assert.throws(()=>validateSnapshot({}));assert.throws(()=>validateSnapshot({...fixture,observed_at:'invalid'}));assert.throws(()=>validateSnapshot({...fixture,config:{memory_limit:{}}}));assert.throws(()=>validateSnapshot({...fixture,config:{memory_limit:'x'.repeat(129)}}));
});
test('diagnostic script authenticates, expires, scopes CORS and performs no process or file operations',()=>{
 const php=makePHP({tokenHash:'a'.repeat(64),expires:1800000000,origin:'https://audit.example.com'});
 assert.ok(php.includes("hash('sha256', $token)"));assert.ok(php.includes('time() > 1800000000'));assert.ok(php.includes("$allowed_origin = 'https://audit.example.com'"));assert.ok(php.includes("$method !== 'GET'"));
 assert.ok(!/\b(?:exec|shell_exec|system|passthru|popen|proc_open|eval|fopen|file_put_contents)\s*\(/i.test(php));
 assert.ok(!php.includes('$_GET'));assert.ok(!php.includes('$_POST'));
 assert.throws(()=>makePHP({tokenHash:'bad',expires:0,origin:'https://a.com'}));
 assert.throws(()=>makePHP({tokenHash:'a'.repeat(64),expires:1800000000,origin:"https://a.com';system('id');//"}));
});
