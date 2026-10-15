import {plan,project,captions} from './project.js';
import {art} from './mv.js';
import {sample,keyTimes,validatePlan} from './plan.mjs';
validatePlan(plan);
const assets={};
for(const [id,src] of Object.entries(plan.backgrounds||{})){
 const im=new Image();im.src=src;await im.decode();if(im.width!==320||im.height!==180)throw Error('Draw native 320x180 background: '+id);assets[id]=im;
}
const builtin=new Set(['playground-gray','playground-clear','playground-dusk','gate','classroom','corridor','railing']);
for(const s of Object.values(plan.scenes))if(!builtin.has(s.background)&&!assets[s.background])throw Error('Missing actual scene artwork: '+s.background);
const times=keyTimes(plan),blocking=new URLSearchParams(location.search).has('blocking');
function render(t,caption=true){
 t=Math.max(0,Math.min(project.duration-1e-7,t));const q=blocking?(times.filter(k=>k<=t).at(-1)||0):t;
 const shot=plan.shots.find(s=>q>=s.start&&q<s.end),scene=plan.scenes[shot.scene],cam=shot.camera||{scale:1,x:0,y:0};
 art.begin();art.camera(cam.scale,cam.x,cam.y);
 if(assets[scene.background])art.image(assets[scene.background],0,0,320,180);else art.background(scene.background,q);
 // Actor/prop/environment state uses the same sampled time, including blocking.
 for(const actor of scene.actors||[]){const p=sample(actor.keys,q);if(!p.visible)continue;art.depth(actor.identity==='pink',p.x,p.y,q,p.scale,p)}
 for(const prop of scene.props||[]){const p=sample(prop.keys,q);if(p.visible===false)continue;
  if(prop.kind==='rect')art.rect(p.x,p.y,p.width,p.height,prop.color);
  else if(prop.kind==='line')art.line([[p.x,p.y],[p.x2,p.y2]],prop.color,prop.width||1);
  else throw Error('Draw the required prop in timeline.mjs instead of silently substituting: '+prop.kind);
 }
 const weather=scene.weather||{};if(weather.leaves)art.leaves(q,weather.leaves==='strong');if(weather.rain)art.rain(q,weather.rain);
 art.endCamera();if(scene.grain!==false)art.grain(q);if(caption)art.subtitle(t);art.present();
 return {time:t,sceneTime:q,shot:shot.id,blocking};
}
window.DUR=project.duration;window.render=render;
window.PRODUCTION={workflowVersion:'1.1',revision:project.revision,duration:project.duration,fps:project.fps,logical:[320,180],output:[project.width,project.width*9/16],audio:project.audio,status:plan.status,engine:'timeline',captions,shots:plan.shots.map(s=>[s.id,s.start,s.end,s.size||'',s.meaning]),keys:times,planChecks:plan.shots.map(s=>({id:s.id,checks:s.checks})),normalSpeedAV:'requires human review'};
render(0);window.READY=true;
