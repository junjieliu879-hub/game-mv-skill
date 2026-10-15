import {renderTemp} from './render-storage.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import puppeteer from 'puppeteer-core';
import {project,shots,captions,keys} from './project.js';

const root=path.dirname(fileURLToPath(import.meta.url)),video=process.argv[2];
const browsers=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const executablePath=browsers.find(p=>p&&fs.existsSync(p));if(!executablePath)throw Error('Set CHROME_PATH.');
assert.equal(shots[0][1],0);assert.equal(shots.at(-1)[2],project.duration);
for(let i=0;i<shots.length;i++){assert.ok(shots[i][2]>shots[i][1]);if(i)assert.equal(shots[i-1][2],shots[i][1]);}
for(const [a,b,label] of captions){assert.ok(a>=0&&b>a&&b<=project.duration);if(/^[\x20-\x7e]*$/.test(label))assert.ok(label.length<=51,'Bitmap caption too wide.');}
assert.ok(keys.every((t,i)=>t>=0&&t<project.duration&&(!i||t>=keys[i-1])));
const server=spawn(process.execPath,[path.join(root,'preview.mjs')],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;
try{
 const [chunk]=await once(server.stdout,'data'),url=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 const profile=fs.mkdtempSync(path.join(renderTemp,'puppeteer_dev_chrome_profile-check-'));
 browser=await puppeteer.launch({executablePath,headless:true,userDataDir:profile,args:['--disk-cache-dir='+path.join(profile,'Cache')]});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(url+'/demo.html');await page.waitForFunction('window.READY===true');
 const frames=await page.evaluate(shots=>{
  const c=document.querySelector('canvas'),ctx=c.getContext('2d'),result=[];
  for(const shot of shots){const t=(shot[1]+shot[2])/2;window.render(t,false);const first=c.toDataURL();window.render(0);window.render(55);window.render(t,false);
   const data=ctx.getImageData(0,0,c.width,c.height).data;let opaque=true,nearest=true;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=(y*c.width+x)*4,b=((y-y%6)*c.width+x-x%6)*4;
    if(data[a+3]!==255)opaque=false;for(let z=0;z<3;z++)if(data[a+z]!==data[b+z])nearest=false;}
   result.push({shot:shot[0],seekSafe:first===c.toDataURL(),opaque,nearest});
  }
  return result;
 },shots);
 assert.ok(frames.every(x=>x.seekSafe&&x.opaque&&x.nearest));
 const modes=await page.evaluate(()=>{
  const c=document.querySelector('canvas');window.render(3,true);const sub=c.toDataURL();window.render(3,false);const noSub=c.toDataURL();window.render(3,true);
  const captionsOnly=sub!==noSub&&sub===c.toDataURL();
  const times=Array.from({length:24},(_,i)=>8.25+i/48),states=times.map(t=>{window.render(t);return c.toDataURL()});
  return {captionsOnly,sampledFrames:states.length,distinctFrames:new Set(states).size};
 });
 assert.ok(modes.captionsOnly&&modes.distinctFrames>1);
 await page.waitForFunction("document.querySelector('audio').readyState>=2");await page.click('#play');
 await page.waitForFunction("document.querySelector('audio').currentTime>.05&&!document.querySelector('audio').paused");
 await page.click('#play');assert.ok(await page.evaluate(()=>document.querySelector('audio').paused));
 await page.$eval('#seek',e=>{e.value='35.25';e.dispatchEvent(new Event('input',{bubbles:true}))});
 assert.ok(await page.evaluate(()=>Math.abs(document.querySelector('audio').currentTime-35.25)<.03));
 await page.goto(url+'/film.html?blocking');await page.waitForFunction('window.READY===true');
 const blocked=await page.evaluate(()=>{const c=document.querySelector('canvas');window.render(8.2,false);const a=c.toDataURL();window.render(8.25,false);return a===c.toDataURL()});assert.ok(blocked);
 assert.deepEqual(errors,[]);
 const report={revision:project.revision,shots:frames,modes,blockingAllSceneState:true,previewPlaybackAndSeek:true,browserErrors:errors,continuousAudiovisualReview:'not performed by this technical check'};
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
