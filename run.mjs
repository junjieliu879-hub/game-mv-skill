import {renderTemp} from './render-storage.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {spawnSync,spawn} from 'node:child_process';import {createHash} from 'node:crypto';
import {validatePlan,storyboard,resolvePlan} from './plan.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),command=process.argv[2],args=process.argv.slice(3);
if(!['preview','render','check','mix'].includes(command))throw Error('Use preview, render, check or mix.');
let project;
const planFile=path.join(root,'director-plan.json');
if(fs.existsSync(planFile)){
 const plan=resolvePlan(JSON.parse(fs.readFileSync(planFile,'utf8')));project=plan.project;
 validatePlan(plan);if(plan.status==='design')throw Error('Still in design. Make actual complete poses and mark rough before rendering.');
 for(const input of [plan.input.audio,plan.input.lyrics].filter(Boolean)){
  const file=path.resolve(root,input.path);if(!fs.existsSync(file))throw Error('Missing locked input: '+input.path);
  if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==input.sha256)throw Error('Input changed. Recheck timing and update the plan deliberately: '+input.path);
 }
 fs.writeFileSync(path.join(root,'STORYBOARD.md'),storyboard(plan));
}else project=(await import(pathToFileURL(path.join(root,'project.js')).href)).project;
const audio=path.resolve(root,project.audio);
if(!fs.existsSync(audio)){
 if(!fs.existsSync(planFile)&&project.audio==='assets/demo.wav'){
  const r=spawnSync(process.execPath,[path.join(root,'make-audio.mjs')],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
 }else throw Error('Original audio is missing: '+project.audio+'. No demo music will be substituted.');
}
if(command==='mix'){
 const r=spawnSync(process.execPath,[path.join(root,'mix-audio.mjs')],{cwd:root,stdio:'inherit'});process.exit(r.status??1);
}else if(command==='preview'){
 const child=spawn(process.execPath,[path.join(root,'preview.mjs')],{cwd:root,stdio:'inherit'});child.on('exit',code=>process.exit(code||0));
}else{
 const flags=command==='render'?['--page','film.html','--audio',project.audio,'--out','output/mv.mp4','--fps',String(project.fps),'--width',String(project.width)]:[];
 const script=command==='render'?'render.mjs':'check.mjs';
 const r=spawnSync(process.execPath,[path.join(root,script),...flags,...args],{cwd:root,stdio:'inherit',env:process.env});if(r.error)throw r.error;process.exit(r.status??1);
}
