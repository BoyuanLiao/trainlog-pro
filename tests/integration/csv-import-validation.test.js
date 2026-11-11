'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

// Extract the CSV parser and importer without initializing the browser UI.
const source=fs.readFileSync('js/app.js','utf8');
const begin=source.indexOf('function parseCSV(text){');
const end=source.indexOf('function goPage(id){',begin);
assert(begin>=0&&end>begin,'CSV import functions must remain available');

const ctx={
	CURRENT_SCHEMA:19,
	data:{exerciseLibrary:[],settings:{}},
	uid:()=> 'generated-id',
	isoToday:()=> '2026-11-11',
	tr:key=>key,
	n:value=>Number(value)||0,
	normalizeWeightUnit:value=>value==='lb'?'lb':'kg'
};
vm.createContext(ctx);
vm.runInContext(source.slice(begin,end),ctx);

const valid='workoutId,date,exerciseId,exerciseName,type,workoutName,weightKg,reps\n'+
	'w1,2026-11-11,e1,Chest Press,weight_reps,Workout,40,10\n';
const result=ctx.csvToData(valid);
assert.strictEqual(result.workouts.length,1);
assert.strictEqual(result.workouts[0].exercises[0].sets[0].weight,40);

// Prevent an unrelated spreadsheet from silently becoming bogus workout data.
assert.throws(()=>ctx.csvToData('date,name,amount\n2026-11-11,Lunch,80\n'),/invalid TrainLog Pro CSV headers/);
assert.throws(()=>ctx.csvToData('workoutId,date,exerciseId,exerciseName,type,type\nw1,2026-11-11,e1,Press,weight_reps,weight_reps\n'),/invalid TrainLog Pro CSV headers/);

console.log('CSV import validation: valid format and malformed headers checked');
