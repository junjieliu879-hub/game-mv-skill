import {renderTemp} from './render-storage.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import puppeteer from 'puppeteer-core';


const root=path.dirname(fileURLToPath(import.meta.url)),video=process.argv[2];
const browsers=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const executablePath=browsers.find(p=>p&&fs.existsSync(p));if(!executablePath)throw Error('Set CHROME_PATH.');
const server=spawn(process.execPath,[path.join(root,'preview.mjs')],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;
try{
 const [chunk]=await once(server.stdout,'data'),url=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 const profile=fs.mkdtempSync(path.join(renderTemp,'puppeteer_dev_chrome_profile-check-'));
 browser=await puppeteer.launch({executablePath,headless:true,userDataDir:profile,args:['--disk-cache-dir='+path.join(profile,'Cache')]});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(url+'/demo.html');await page.waitForFunction('window.READY===true||window.BOOT_ERROR');const boot=await page.evaluate(()=>window.BOOT_ERROR);if(boot)throw Error(boot);
 const production=await page.evaluate(()=>window.PRODUCTION),{shots,captions,keys,duration:duration,fps}=production;
 const project={revision:production.revision,width:production.output[0],duration,fps};
 assert.equal(shots[0][1],0);assert.equal(shots.at(-1)[2],duration);
 for(let i=0;i<shots.length;i++){assert.ok(shots[i][2]>shots[i][1]);if(i)assert.equal(shots[i-1][2],shots[i][1]);}
 for(const [a,b,label] of captions){assert.ok(a>=0&&b>a&&b<=duration);if(/^[\x20-\x7e]*$/.test(label))assert.ok(label.length<=51,'Bitmap caption too wide.');}
 const frames=await page.evaluate(shots=>{
  const c=document.querySelector('canvas'),ctx=c.getContext('2d'),result=[];
  for(const shot of shots){const t=(shot[1]+shot[2])/2;window.render(t,false);const first=c.toDataURL();window.render(0);window.render(window.DUR*.9);window.render(t,false);
   const data=ctx.getImageData(0,0,c.width,c.height).data;let opaque=true,nearest=true;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=(y*c.width+x)*4,b=((y-y%(c.height/180))*c.width+x-x%(c.width/320))*4;
    if(data[a+3]!==255)opaque=false;for(let z=0;z<3;z++)if(data[a+z]!==data[b+z])nearest=false;}
   result.push({shot:shot[0],seekSafe:first===c.toDataURL(),opaque,nearest});
  }
  return result;
 },shots);
 assert.ok(frames.every(x=>x.seekSafe&&x.opaque&&x.nearest));
 const modes=await page.evaluate(({captions,duration,fps})=>{
  const c=document.querySelector('canvas'),t=captions.length?(captions[0][0]+captions[0][1])/2:duration/2;
  window.render(t,true);const sub=c.toDataURL();window.render(t,false);const noSub=c.toDataURL();window.render(t,true);
  const captionsOnly=!captions.length?'not applicable':sub!==noSub&&sub===c.toDataURL();
  const count=Math.min(24,Math.floor(duration*fps)),states=Array.from({length:count},(_,i)=>{window.render(Math.min(duration*.5+i/fps,duration-1e-6));return c.toDataURL()});
  return {captionsOnly,sampledFrames:states.length,distinctFrames:new Set(states).size,scope:'sampling only; static poses and environment motion do not prove acting quality'};
 },{captions,duration,fps});
 assert.notEqual(modes.captionsOnly,false);
 await page.waitForFunction("document.querySelector('audio').readyState>=2");await page.click('#play');
 await page.waitForFunction("document.querySelector('audio').currentTime>.05&&!document.querySelector('audio').paused");
 await page.click('#play');assert.ok(await page.evaluate(()=>document.querySelector('audio').paused));
 const seekTime=duration*.6;
 await page.$eval('#seek',(e,t)=>{e.value=String(t);e.dispatchEvent(new Event('input',{bubbles:true}))},seekTime);
 assert.ok(await page.evaluate(t=>Math.abs(document.querySelector('audio').currentTime-t)<.03,seekTime));
 await page.goto(url+'/film.html?blocking');await page.waitForFunction('window.READY===true');
 const ranges=(keys||[0]).map((t,i,a)=>[t,a[i+1]||duration]).filter(([a,b])=>b-a>2/fps);
 let blocked='not applicable';
 if(ranges.length){const [a,b]=ranges.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];
 blocked=await page.evaluate(([a,b])=>{const c=document.querySelector('canvas');window.render(a+(b-a)*.3,false);const p=c.toDataURL();window.render(a+(b-a)*.6,false);return p===c.toDataURL()},[a,b]);assert.ok(blocked);}
 assert.deepEqual(errors,[]);
 const report={revision:project.revision,shots:frames,modes,blockingAllSceneState:blocked,previewPlaybackAndSeek:true,browserErrors:errors,eventContactAndHandoffReview:'manual; see actual shot checks',continuousAudiovisualReview:'not performed by this technical check'};
 if(video){
  const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.resolve(video)],{encoding:'utf8'}));
  const v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
  assert.equal(v.width,project.width);assert.equal(v.height,project.width*9/16);assert.equal(v.r_frame_rate,project.fps+'/1');
  assert.equal(Number(v.nb_frames),Math.ceil(project.duration*project.fps));assert.ok(a&&Math.abs(Number(a.duration)-project.duration)<.03);
  execFileSync('ffmpeg',['-v','error','-i',path.resolve(video),'-f','null','-'],{stdio:['ignore','pipe','pipe']});
  report.encoded={width:v.width,height:v.height,fps:v.r_frame_rate,frames:Number(v.nb_frames),audioSeconds:Number(a.duration),fullDecode:true};
 }
 fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output/check.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();server.kill();}
