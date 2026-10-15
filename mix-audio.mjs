import {renderTemp} from './render-storage.mjs';
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),file=path.join(root,'director-plan.json');
if(!fs.existsSync(file))throw Error('Mix only a real song project with director-plan.json.');
const plan=JSON.parse(fs.readFileSync(file,'utf8')),events=(plan.events||[]).filter(e=>e.sound);
if(!events.length){console.log('No sound events; original audio unchanged.');process.exit(0)}
const output='assets/private/mix.wav',out=path.join(root,output);if(fs.existsSync(out))throw Error('Mix exists; preserve it or choose a new revision before remixing.');
const args=['-v','error','-n','-i',path.resolve(root,plan.input.audio.path)],filters=[],inputs=['[0:a]'];
for(const [i,e] of events.entries()){
 const sound=path.resolve(root,e.sound.path),gain=e.sound.gain??.2;
 if(!fs.existsSync(sound)||!Number.isFinite(gain)||gain<0||gain>2||e.t<0||e.t>=plan.project.duration)throw Error('Invalid actual sound event '+e.id);
 args.push('-i',sound);filters.push(`[${i+1}:a]volume=${gain},adelay=${Math.round(e.t*1000)}:all=1[s${i}]`);inputs.push(`[s${i}]`);
}
filters.push(inputs.join('')+`amix=inputs=${inputs.length}:duration=first:normalize=0,alimiter=limit=0.95:level=false[a]`);
const r=spawnSync('ffmpeg',[...args,'-filter_complex',filters.join(';'),'-map','[a]','-c:a','pcm_s16le',out],{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);
plan.project.audio=output;if(plan.review){plan.review.technical='pending';plan.review.listening='pending';plan.review.normalSpeedViewing='pending';}fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n');
console.log('Mixed the original track with '+events.length+' timed events; preview/render now share '+output+'. Listening remains required.');
