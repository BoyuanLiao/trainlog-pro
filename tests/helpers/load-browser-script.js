'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');

const ROOT=path.resolve(__dirname,'../..');

function createBrowserContext(extra={}){
  const sandbox={console,...extra};
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function loadBrowserScript(context,relativePath){
  const filename=path.resolve(ROOT,relativePath);
  const source=fs.readFileSync(filename,'utf8');
  vm.runInContext(source,context,{filename});
  return context;
}

function readGlobal(context,expression){
  return vm.runInContext(expression,context);
}

module.exports={ROOT,createBrowserContext,loadBrowserScript,readGlobal};
