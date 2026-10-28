const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'..'),root=path.resolve(base,'../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const fragment=JSON.parse(fs.readFileSync(path.join(root,'mvu/technical-worldbook-fragment.json')));
const original=JSON.parse(read('reference/MVU变量卡_空模板.json')).data.character_book;
assert.equal(fragment.entries.length,4);
fragment.entries.forEach((e,i)=>{
 const ref=original.entries[i];
 for(const key of Object.keys(ref).filter(k=>!['content','insertion_order'].includes(k)))assert.deepEqual(e[key],ref[key],key);
 assert.equal(e.use_regex,true);assert.equal(e.extensions.scan_depth,null);assert.equal(e.extensions.prevent_recursion,true);assert.equal(e.extensions.exclude_recursion,true);
 if(i<3){assert.equal(e.position,'at_depth');assert.equal(e.extensions.depth,0);assert.ok(e.insertion_order>470)}else assert.equal(e.enabled,false);
});
assert.equal(fragment.entries[3].content.trim(),'{}');assert.ok(fragment.entries[1].content.includes('<JSONPatch>[]</JSONPatch>'));
assert.equal(read('src/MVU.js').trim(),read('reference/MVU.js').trim());
const zod=read('src/MVU_ZOD.js');assert.match(zod,/z\.object\(\{\}\)\.loose\(\)\.prefault\(\{\}\)/);assert.equal((zod.match(/^import /gm)||[]).length,1);assert.match(zod,/registerMvuSchema\(Schema\)/);
const z=require('zod');const Schema=z.object({}).loose().prefault({});const sample={原生字段:{数值:12},另一个:'保留'};assert.deepEqual(Schema.parse(sample),sample);assert.deepEqual(Schema.parse(Schema.parse(sample)),sample);assert.deepEqual(Schema.parse(undefined),{});
const code=read('dist/steel-maidens-mvu.js');assert.ok(!code.includes('</script>'));assert.ok(!code.includes('iframe'));assert.ok(!/replaceMvuData|updateWorldbookWith|JSONPatch/.test(code));assert.ok(!/role\s*===\s*['"]assistant/.test(code));assert.equal((code.match(/createElement\('audio'\)/g)||[]).length,1);
const provenance=JSON.parse(read('reference/provenance.json'));provenance.files.forEach(f=>assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(base,f.reference))).digest('hex'),f.sha256));
console.log('Static: four native entries, schema passthrough/idempotence, core import, provenance and isolation PASS');
