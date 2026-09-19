'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {spawnSync}=require('child_process');

const ROOT=path.resolve(__dirname,'../..');

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

const files=[
  ...walk(path.join(ROOT,'js')).filter(x=>x.endsWith('.js')),
  ...walk(path.join(ROOT,'tests')).filter(x=>x.endsWith('.js')),
  path.join(ROOT,'sw.js')
].sort();

const failures=[];
files.forEach(file=>{
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)failures.push({
    file:path.relative(ROOT,file),
    output:(result.stderr||result.stdout||'').trim()
  });
});
assert.deepStrictEqual(failures,[],'JavaScript syntax failures:\n'+failures.map(x=>x.file+'\n'+x.output).join('\n\n'));

console.log(`javascript syntax: ${files.length} files passed node --check`);
