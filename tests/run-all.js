'use strict';

const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const ROOT=path.resolve(__dirname,'..');
const TEST_ROOT=path.join(ROOT,'tests');

function discover(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())return discover(full);
    return entry.name.endsWith('.test.js')?[full]:[];
  });
}

const tests=discover(TEST_ROOT).sort();
const failures=[];

console.log(`TrainLog Pro full test suite: ${tests.length} test files\n`);
for(const file of tests){
  const rel=path.relative(ROOT,file);
  console.log(`▶ ${rel}`);
  const result=spawnSync(process.execPath,[file],{cwd:ROOT,stdio:'inherit'});
  if(result.status!==0)failures.push(rel);
  console.log('');
}

console.log(`Completed: ${tests.length-failures.length}/${tests.length} test files passed.`);
if(failures.length){
  console.error('Failed test files:');
  failures.forEach(file=>console.error(' - '+file));
  process.exit(1);
}
