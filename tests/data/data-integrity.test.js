'use strict';

const assert=require('assert');
const {createBrowserContext,loadBrowserScript,readGlobal}=require('../helpers/load-browser-script');

const ctx=createBrowserContext();
loadBrowserScript(ctx,'js/data/equipment.js');
loadBrowserScript(ctx,'js/data/exercises.js');
loadBrowserScript(ctx,'js/data/programs.js');

const equipment=readGlobal(ctx,'SYSTEM_EQUIPMENT');
const exercises=readGlobal(ctx,'SYSTEM_EXERCISES');
const programs=readGlobal(ctx,'SYSTEM_PROGRAMS');

assert(Array.isArray(equipment)&&equipment.length>0,'equipment library must not be empty');
assert(Array.isArray(exercises)&&exercises.length>0,'exercise library must not be empty');
assert(Array.isArray(programs)&&programs.length>0,'program library must not be empty');

function assertUniqueIds(items,label){
  const ids=items.map(x=>x.id);
  assert(ids.every(Boolean),label+' entries require ids');
  assert.strictEqual(new Set(ids).size,ids.length,label+' ids must be unique');
}
assertUniqueIds(equipment,'equipment');
assertUniqueIds(exercises,'exercise');
assertUniqueIds(programs,'program');

const equipmentIds=new Set(equipment.map(x=>x.id));
const exerciseIds=new Set(exercises.map(x=>x.id));
const allowedTypes=new Set(['weight_reps','duration','cardio','unilateral','bodyweight']);

equipment.forEach(item=>{
  assert.strictEqual(typeof item.nameZh,'string',item.id+' requires nameZh');
  assert(item.nameZh.trim(),item.id+' nameZh cannot be blank');
  if(item.aliases!=null)assert(Array.isArray(item.aliases),item.id+' aliases must be an array');
  if(item.brandModels!=null)assert(Array.isArray(item.brandModels),item.id+' brandModels must be an array');
});

exercises.forEach(ex=>{
  assert.strictEqual(typeof ex.name,'string',ex.id+' requires name');
  assert(ex.name.trim(),ex.id+' name cannot be blank');
  assert.strictEqual(typeof ex.muscle,'string',ex.id+' requires muscle');
  assert(allowedTypes.has(ex.type),ex.id+' has unsupported type '+ex.type);
  assert(Number(ex.targetSets)>0,ex.id+' targetSets must be > 0');
  assert(Number(ex.repMin)<=Number(ex.repMax),ex.id+' rep range is reversed');
  if(ex.intMin!=null&&ex.intMax!=null)assert(Number(ex.intMin)<=Number(ex.intMax),ex.id+' intensity range is reversed');
  if(ex.equipmentId)assert(equipmentIds.has(ex.equipmentId),ex.id+' references missing equipment '+ex.equipmentId);
  (ex.alternatives||[]).forEach(id=>assert(exerciseIds.has(id),ex.id+' references missing alternative '+id));
});

programs.forEach(program=>{
  assert.strictEqual(typeof program.nameZh,'string',program.id+' requires nameZh');
  assert(program.nameZh.trim(),program.id+' nameZh cannot be blank');
  assert(Array.isArray(program.workouts)&&program.workouts.length>0,program.id+' requires workouts');
  if(program.daysPerWeek!=null){
    assert(Number(program.daysPerWeek)>=1&&Number(program.daysPerWeek)<=7,program.id+' daysPerWeek out of range');
  }
  program.workouts.forEach((workout,wi)=>{
    assert(Array.isArray(workout.items)&&workout.items.length>0,program.id+' workout '+wi+' requires items');
    workout.items.forEach((item,ii)=>{
      assert(exerciseIds.has(item.exerciseId),program.id+' item '+wi+':'+ii+' references missing exercise '+item.exerciseId);
      assert(Number(item.targetSets)>0,program.id+' '+item.exerciseId+' targetSets must be > 0');
      if(item.repMin!=null&&item.repMax!=null){
        assert(Number(item.repMin)<=Number(item.repMax),program.id+' '+item.exerciseId+' rep range is reversed');
      }
    });
  });
});

console.log(`data integrity: ${equipment.length} equipment, ${exercises.length} exercises, ${programs.length} programs verified`);
