import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {sample,validatePlan,keyTimes,resolvePlan} from './plan.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./acting-example.json',import.meta.url),'utf8'));
function plan(){const p=structuredClone(fixture);p.input.audio.sha256='a'.repeat(64);return resolvePlan(p)}
test('new shot IDs and a changed timeline are executable, not routed to old campus shots',()=>{const p=plan();assert.equal(validatePlan(p).shots,3);assert.equal(p.shots[0].id,'A');assert.ok(keyTimes(p).includes(1.55));});
test('per-channel timing holds turns while allowing hand movement',()=>{const keys=[{t:0,x:0,reach:0,view:'front',ease:{reach:'linear'}},{t:2,x:10,reach:1,view:'side'}];const p=sample(keys,1);assert.equal(p.reach,.5);assert.equal(p.view,'front');assert.equal(p.x,0);assert.equal(sample(keys,2).view,'side');});
test('a change of duration cannot silently leave uncovered music',()=>{const p=plan();p.project.duration=9;assert.throws(()=>validatePlan(p),/full declared audio/);});
test('the bridge rejects missing poses, invented scene names and timing gaps',()=>{let p=plan();delete p.scenes.path.actors[0].keys[0].view;assert.throws(()=>validatePlan(p),/Incomplete pose/);p=plan();p.shots[0].scene='missing';assert.throws(()=>validatePlan(p),/Unknown scene/);p=plan();p.shots[1].start+=.3;assert.throws(()=>validatePlan(p),/gap/);});
test('unmade design and unmeasured input are not declared production-ready',()=>{let p=plan();p.shots=[];assert.throws(()=>validatePlan(p),/No designed shots/);assert.throws(()=>validatePlan(resolvePlan(fixture)),/measured input/);});
