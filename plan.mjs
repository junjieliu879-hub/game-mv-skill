// The plan drives the new-film player. It validates structure, not artistic quality.
const curves={hold:()=>0,linear:t=>t,smoothstep:t=>t*t*(3-2*t),inQuad:t=>t*t,outCubic:t=>1-(1-t)**3};
export const poseDefaults={x:0,y:0,scale:1,visible:true,view:'front',dir:1,walk:false,reach:0,wave:0,down:0,smile:0,sad:0,sit:0,look:0,lean:0,squint:0};
export function resolvePlan(input){
 const p=structuredClone(input),events=new Map();
 for(const e of p.events||[]){if(events.has(e.id))throw Error('Duplicate event '+e.id);events.set(e.id,e.t)}
 for(const scene of Object.values(p.scenes||{}))for(const obj of [...(scene.actors||[]),...(scene.props||[])])for(const key of obj.keys||[]){
  if(key.at){if(!events.has(key.at))throw Error('Unknown event '+key.at);const t=events.get(key.at)+(key.offset||0);if(key.t!==undefined&&key.t!==t)throw Error('Conflicting event/key time');key.t=t}
 }
 return p;
}
export function sample(keys,t){
 let i=0;while(i+1<keys.length&&keys[i+1].t<=t)i++;
 const a=keys[i],b=keys[i+1];if(!b||t<a.t)return {...a};
 const q=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))),result={...a};
 for(const [field,ease] of Object.entries(a.ease||{})){
  if(typeof a[field]!=='number'||typeof b[field]!=='number')throw Error('Cannot interpolate '+field);
  if(!curves[ease])throw Error('Unknown ease '+ease);
  result[field]=a[field]+(b[field]-a[field])*curves[ease](q);
 }
 return result;
}
export function keyTimes(plan){return [...new Set([0,...plan.shots.flatMap(s=>[s.start,s.end]),...Object.values(plan.scenes).flatMap(s=>[...(s.actors||[]),...(s.props||[])].flatMap(a=>a.keys.map(k=>k.t))),...(plan.events||[]).map(e=>e.t)])].filter(t=>t<plan.project.duration).sort((a,b)=>a-b)}
export function validatePlan(plan){
 const fail=m=>{throw Error(m)},finite=n=>typeof n==='number'&&Number.isFinite(n);
 if(!plan?.project||!finite(plan.project.duration)||plan.project.duration<=0)fail('Missing real audio duration.');
 const {duration,width,fps}=plan.project;
 if(!Number.isInteger(width)||width%320||width<320||width>3840||!Number.isInteger(fps)||fps<1||fps>60)fail('Invalid output width/fps.');
 if(!['design','rough','production'].includes(plan.status))fail('Use design, rough or production status.');
 if(!plan.shots?.length)fail('No designed shots: read WORKFLOW.md and build the event/pose plan before rendering.');
 if(!plan.input?.audio?.path||!/^[a-f0-9]{64}$/.test(plan.input.audio.sha256||''))fail('Missing measured input audio and hash. Use create-project.mjs.');
 const ids=new Set();let end=0;
 for(const shot of plan.shots){
  if(!shot.id||ids.has(shot.id))fail('Duplicate/missing shot ID.');ids.add(shot.id);
  if(!finite(shot.start)||!finite(shot.end)||Math.abs(shot.start-end)>1e-6||shot.end<=shot.start)fail('Shot gap, overlap or invalid range: '+shot.id);
  end=shot.end;if(!plan.scenes[shot.scene])fail('Unknown scene: '+shot.scene);
  for(const f of ['meaning','first','last','handoff','timingEvidence'])if(typeof shot[f]!=='string'||!shot[f].trim())fail('Missing '+f+': '+shot.id);
  if(!Array.isArray(shot.checks)||!shot.checks.length)fail('Missing observable checks: '+shot.id);
  const cam=shot.camera||{scale:1,x:0,y:0};if(!Number.isInteger(cam.scale)||cam.scale<1||!finite(cam.x)||!finite(cam.y))fail('Invalid native-pixel camera: '+shot.id);
 }
 if(Math.abs(end-duration)>1e-6)fail('Shots must cover the full declared audio duration, including the tail.');
 if(!Number.isFinite(plan.input.audio.duration)||Math.abs(plan.input.audio.duration-duration)>.03)fail('Preserve the full declared audio duration from the measured input.');
 for(const [id,scene] of Object.entries(plan.scenes)){
  if(!scene.background)fail('Missing background: '+id);
  const actors=new Set();
  for(const actor of scene.actors||[]){
   if(!actor.id||actors.has(actor.id))fail('Duplicate actor ID in '+id);actors.add(actor.id);
   if(!['yellow','pink'].includes(actor.identity))fail('Built-in actor must be yellow or pink; draw other identities explicitly.');
  }
  for(const obj of [...(scene.actors||[]),...(scene.props||[])]){
   if(!obj.keys?.length)fail('Missing complete poses for '+obj.id);
   for(let i=0;i<obj.keys.length;i++){
    const k=obj.keys[i];if(!finite(k.t)||k.t<0||k.t>duration||(i&&k.t<=obj.keys[i-1].t))fail('Invalid key times for '+obj.id);
    if(!finite(k.x)||!finite(k.y))fail('Missing x/y in complete pose: '+obj.id);
    if(obj.identity){for(const f of Object.keys(poseDefaults))if(!(f in k))fail('Incomplete pose '+obj.id+': '+f);
     if(!['front','quarter','side','back'].includes(k.view)||![1,-1].includes(k.dir)||!finite(k.scale)||k.scale<=0)fail('Invalid pose: '+obj.id);
    }
    for(const e of Object.values(k.ease||{}))if(!curves[e])fail('Unknown easing: '+e);
   }
  }
 }
 for(const e of plan.events||[])if(!e.id||!finite(e.t)||e.t<0||e.t>duration||!e.action||!e.result)fail('Invalid action/result event.');
 for(const c of plan.captions||[])if(typeof c.text!=='string'||!finite(c.start)||!finite(c.end)||c.start<0||c.end<=c.start||c.end>duration)fail('Invalid caption.');
 return {shots:plan.shots.length,scenes:Object.keys(plan.scenes).length,status:plan.status,semanticAcceptance:'requires actual viewing'};
}
export function storyboard(plan){return '# 当前分镜（由 director-plan.json 派生，不单独改时间）\n\n'+
 `版本：${plan.project.revision}；状态：${plan.status}；原声：${plan.project.duration}秒；${plan.project.width}×${plan.project.width*9/16}／${plan.project.fps}fps。\n\n`+
 (plan.story||'')+'\n\n|镜头|原声秒|含义与事件|开始→结束|下一镜接住|检查|\n|---|---|---|---|---|---|\n'+
 plan.shots.map(s=>`|${s.id}|${s.start}—${s.end}|${s.meaning}|${s.first} → ${s.last}|${s.handoff}|${s.checks.join('；')}|`).join('\n')+'\n\n技术检查不替代正常速度连续视听与用户认可。\n'}
