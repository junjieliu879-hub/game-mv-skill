import {renderTemp} from './render-storage.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';

const opts={};
for(let i=2;i<process.argv.length;i+=2){
  if(!process.argv[i].startsWith('--')||process.argv[i+1]===undefined) throw Error('Use --name value pairs.');
  opts[process.argv[i].slice(2)]=process.argv[i+1];
}
for(const key of ['page','out']) if(!opts[key]) throw Error(`Missing --${key}`);
const pageFile=path.resolve(opts.page),out=path.resolve(opts.out);let audioFile=opts.audio?path.resolve(opts.audio):null;
if(fs.existsSync(out)) throw Error('Output already exists; use a new filename.');
for(const f of [pageFile,audioFile].filter(Boolean)) if(!fs.existsSync(f)) throw Error(`Missing file: ${f}`);
const root=path.dirname(pageFile);let width=Number(opts.width||1920),height=width*9/16,fps;
const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const executablePath=candidates.find(f=>f&&fs.existsSync(f));
if(!executablePath) throw Error('Set CHROME_PATH to your Chrome/Chromium executable.');
// The optional module path permits testing against an existing installation without changing it.
const mod=process.env.PIXEL_PUPPETEER_MODULE;
const {default:puppeteer}=await import(mod?pathToFileURL(path.resolve(mod)).href:'puppeteer-core');
const server=http.createServer((req,res)=>{
  try{
    const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    if(!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.wav':'audio/wav','.mp4':'video/mp4'})[path.extname(p)]||'application/octet-stream');
    res.setHeader('Content-Length',fs.statSync(p).size);
    if(req.method==='HEAD')return res.end();
    fs.createReadStream(p).pipe(res);
  }catch{res.writeHead(400);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,proc,completion;
try{
  const profile=fs.mkdtempSync(path.join(renderTemp,'puppeteer_dev_chrome_profile-pixel-'));
  browser=await puppeteer.launch({executablePath,headless:true,userDataDir:profile,args:['--disable-background-timer-throttling','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disk-cache-dir='+path.join(profile,'Cache')]});
  console.log('Render TEMP/profile: '+renderTemp+' / '+profile);
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewport({width,height,deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:${server.address().port}/${encodeURIComponent(path.basename(pageFile))}${opts.blocking==='true'?'?blocking':''}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction('window.READY===true||window.BOOT_ERROR',{timeout:30000});
  const boot=await page.evaluate(()=>window.BOOT_ERROR);if(boot)throw Error(boot);
  const production=await page.evaluate(()=>window.PRODUCTION||{});
  if(production.status==='design')throw Error('Finish the event and pose plan before rendering.');
  width=Number(opts.width||production.output?.[0]||1920);height=width*9/16;fps=Number(opts.fps||production.fps||48);
  if(!Number.isInteger(width)||width%320||width<320||width>3840||!Number.isInteger(fps)||fps<1||fps>60)throw Error('Invalid width/fps.');
  await page.setViewport({width,height,deviceScaleFactor:1});
  if(!audioFile&&production.audio)audioFile=path.resolve(root,production.audio);
  if(!audioFile||!fs.existsSync(audioFile))throw Error('Missing actual audio; no silent/demo substitution.');
  await page.evaluate(()=>document.fonts.ready);
  const duration=await page.evaluate(()=>window.DUR);
  if(!Number.isFinite(duration)||duration<=0)throw Error('window.DUR must be finite and positive.');
  const start=Number(opts.start??0),end=Number(opts.end??duration);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>duration) throw Error('Invalid range.');
  if(audioFile){
    const audioDuration=Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-of','json',audioFile],{encoding:'utf8'})).format.duration);
    if(!Number.isFinite(audioDuration)||audioDuration+0.03<end)throw Error('Audio is shorter than the requested range. Align the page timeline to the original audio or supply a complete mix.');
  }
  fs.mkdirSync(path.dirname(out),{recursive:true});
  if(opts.stills){
    const times=opts.stills.split(',').map(Number);
    const data=await page.evaluate(({times,captions})=>{
      const sheet=document.createElement('canvas');sheet.width=1280;sheet.height=Math.ceil(times.length/2)*384;
      const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#151d28';g.fillRect(0,0,sheet.width,sheet.height);
      times.forEach((t,i)=>{window.render(t,captions);const x=(i%2)*640,y=Math.floor(i/2)*384;g.drawImage(document.querySelector('canvas'),x,y,640,360);g.fillStyle='#ffffff';g.font='16px sans-serif';g.fillText(t.toFixed(2)+'s',x+8,y+378)});
      return sheet.toDataURL('image/png').split(',')[1];
    },{times,captions:opts.captions!=='false'});
    if(errors.length)throw Error(errors.join('\n'));
    fs.writeFileSync(out,Buffer.from(data,'base64'));console.log('Stills: '+out);
  }else{
  const metadata={...production,start,end,frames:Math.ceil((end-start)*fps),fps,output:[width,height],captionsEnabled:opts.captions!=='false',blocking:opts.blocking==='true',renderTemp,sourcePage:pageFile,audioFile,audioSha256:createHash('sha256').update(fs.readFileSync(audioFile)).digest('hex')};
  const audioArgs=audioFile?['-ss',String(start),'-t',String(end-start),'-i',audioFile]:['-f','lavfi','-i','anullsrc=r=48000:cl=stereo'];
  proc=spawn('ffmpeg',['-v','error','-n','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0',...audioArgs,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-frames:v',String(Math.ceil((end-start)*fps)),'-movflags','+faststart',out],{stdio:['pipe','ignore','pipe']});
  let errorText='';proc.stderr.on('data',s=>{errorText+=s});
  let pipeError;proc.stdin.on('error',e=>{pipeError=e});
  completion=new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('close',code=>code===0?resolve():reject(Error(`FFmpeg ${code}: ${errorText}`)));});
  completion.catch(()=>{});
  const frames=Math.ceil((end-start)*fps);
  for(let i=0;i<frames;i++){
    if(pipeError)throw pipeError;
    const data=await page.evaluate(({t,width,height,captions})=>{
      window.render(t,captions);
      let target=window.exportCanvas;
      if(!target){target=window.exportCanvas=document.createElement('canvas');target.width=width;target.height=height;}
      const g=target.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(document.querySelector('canvas'),0,0,width,height);
      return target.toDataURL('image/png').split(',')[1];
    },{t:start+i/fps,width,height,captions:opts.captions!=='false'});
    if(!proc.stdin.write(Buffer.from(data,'base64'))) await once(proc.stdin,'drain');
    if(i%Math.round(fps*2)===0)console.log(`${i}/${frames} frames`);
  }
  proc.stdin.end();await completion;
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(out+'.json',JSON.stringify(metadata,null,2));
  console.log(JSON.stringify({audio:audioFile?'supplied':'silent',out,width,height,fps,duration:end-start,frames,visual_acceptance:'not_established_by_render'}));
  }
}finally{
  if(proc&&proc.exitCode===null)proc.kill();
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
