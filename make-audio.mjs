import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {project,shots} from './project.js';

// Original example score, not a transcription or replacement of any user's song.
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,project.audio);
if(fs.existsSync(out)){console.log('Example audio ready: '+project.audio);process.exit(0)}
const sr=44100,n=Math.round(project.duration*sr),pcm=Buffer.alloc(n*4);
const rainStart=shots.find(s=>s[0]==='L04')[1],rainEnd=shots.find(s=>s[0]==='L08')[2];
const tri=(f,t)=>1-4*Math.abs((t*f)%1-.5);
const hz=m=>440*2**((m-69)/12);
const melody=[69,72,76,74,71,67,69,64,65,69,72,71,67,64,62,64];
const chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];
let seed=8675309,peak=0;
for(let i=0;i<n;i++){
 const t=i/sr,beat=t/.75,index=Math.floor(beat),age=t-index*.75;
 const env=(1-Math.exp(-age*28))*Math.exp(-age*3.5),m=melody[Math.floor(index/2)%melody.length];
 let v=.072*(Math.sin(2*Math.PI*hz(m)*t)+.17*tri(hz(m)*2,t))*env;
 const chord=chords[Math.floor(t/6)%chords.length];
 for(const note of chord)v+=.014*Math.sin(2*Math.PI*hz(note)*t)*(1-Math.exp(-(t%6)*3));
 v+=.024*tri(hz(chord[0]-12),t)*Math.exp(-(beat%2)*1.5);
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 if(t>=rainStart&&t<rainEnd){const ramp=Math.min(1,(t-rainStart)/1.2,(rainEnd-t)/1.5);v+=((seed/2147483648)-1)*.018*ramp}
 v*=Math.min(1,t/.15,(project.duration-t)/1.3);peak=Math.max(peak,Math.abs(v));
 pcm.writeInt16LE(Math.round(Math.max(-.95,Math.min(.95,v))*32767),i*4);
 pcm.writeInt16LE(Math.round(Math.max(-.95,Math.min(.95,v*.98))*32767),i*4+2);
}
const wav=Buffer.alloc(44+pcm.length);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVE',8);wav.write('fmt ',12);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*4,28);
wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,wav);
console.log(JSON.stringify({audio:project.audio,seconds:project.duration,peak,source:'original procedural example score'}));
