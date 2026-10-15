import {makeCtx,hash,text as bitmapText,textW} from './pixel-primitives.js';
import {project,captions,shots,keys} from './project.js';
const DUR=project.duration, canvas=document.querySelector('canvas');let k=makeCtx(canvas);const main=k;
const P={ink:'#252b34',white:'#e6e9eb',blue:'#365d8b',blueShade:'#6f90ad',gold:'#e6b947',pink:'#db919b',fog:'#afb9c4',pale:'#c8ced1',mist:'#929fae',gray:'#707f91',deep:'#4d6075',shadow:'#354659',paper:'#c3c2b7',warm:'#c3ac83',wood:'#8c9294',soft:'#b9c2c8',flower:'#fee761'};
const r=(x,y,w,h,c)=>k.rect(x,y,w,h,P[c]||c),px=(x,y,c)=>r(x,y,1,1,c);
const clamp=v=>Math.max(0,Math.min(1,v)),u=(t,a,b)=>clamp((t-a)/(b-a)),s=(t,a,b)=>{let q=u(t,a,b);return q*q*(3-2*q)},mix=(a,b,q)=>a+(b-a)*q;
function line(points,c,w=1){k.g.strokeStyle=P[c]||c;k.g.lineWidth=w;for(let z=1;z<points.length;z++){let[x,y]=points[z-1].map(Math.round),[a,b]=points[z].map(Math.round);let dx=Math.abs(a-x),dy=-Math.abs(b-y),sx=x<a?1:-1,sy=y<b?1:-1,e=dx+dy;for(;;){r(x,y,w,w,c);if(x===a&&y===b)break;const e2=e*2;if(e2>=dy){e+=dy;x+=sx}if(e2<=dx){e+=dx;y+=sy}}}}
function poly(ps,c){let lo=Math.max(0,Math.floor(Math.min(...ps.map(p=>p[1])))),hi=Math.min(180,Math.ceil(Math.max(...ps.map(p=>p[1]))));for(let y=lo;y<hi;y++){let xs=[];ps.forEach((a,i)=>{const b=ps[(i+1)%ps.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))});xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)r(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,c)}}
const plates={};await Promise.all(['playground-gray','playground-clear','playground-dusk','gate','classroom','corridor','railing'].map(async name=>{const im=new Image();im.src='assets/campus/'+name+'.png';await im.decode();plates[name]=im}));
function bg(name){k.g.drawImage(plates[name],0,0)}
function field(name,t){bg(name);const q=Math.floor(t*6)%3-1;poly([[19,42],[33,43+q],[30,48+q],[19,47]],name==='playground-dusk'?'#ce968c':'#b56d64');r(20,43,2,3,'#e4d8b6')}
function flower(x,y){for(const[a,b]of[[0,-1],[-1,0],[1,0],[0,1]])px(x+a,y+b,'white');px(x,y,'paper')}
function actor(pink,x,y,t,{view='front',dir=pink?-1:1,reach=0,wave=0,walk=false,down=0,smile=0,sad=0,sit=0,look=0,lean=0,squint=0}={}){
 x=Math.round(x);y=Math.round(y);const color=pink?'pink':'gold',side=view==='side',back=view==='back',quarter=view==='quarter';const w=side?28:quarter?33:38,h=Math.round(mix(35,31,sit)),half=Math.floor(w/2),phase=walk?Math.floor(t*8)%8:0,step=walk?[0,1,2,1,0,-1,-2,-1][phase]:0,bob=walk&&phase%4===2?-1:0;
 const lower=y-8,top=y-h+bob+Math.round(down),leanX=Math.round(lean),l=x-half,rr=x+half;
 r(l-2,y+2,w+4,1,'deep');
 // Four short legs remain part of the selected block character. Opposing pairs support each step.
 for(const[i,dx]of(side?[-9,-3,4,9]:[-14,-5,5,13]).entries()){const off=walk?step*(i%2?1:-1):0,footY=y+(walk&&off<0?-1:0);r(x+dx,lower,3,footY-lower,'blue');if(i%2===0)r(x+dx,lower,1,footY-lower,'blueShade');r(x+dx+off,footY-1,4,2,'white');r(x+dx+off,footY+1,4,1,'ink')}
 poly([[l+1+leanX,top],[rr-1+leanX,top],[rr+1,lower],[l-1,lower]],'ink');poly([[l+3+leanX,top+2],[rr-3+leanX,top+2],[rr-1,lower-2],[l+1,lower-2]],color);
 const faceX=x+leanX,eyeY=top+8+Math.round(down);
 if(!back){if(side){r(faceX+dir*7,eyeY,2,squint?1:4,'ink');r(faceX+dir*7,top+16,3,1,'ink')}else{const gaze=Math.round(look);r(faceX-9+gaze,eyeY,2,squint?1:4,'ink');r(faceX+7+gaze,eyeY,2,squint?1:4,'ink');if(smile>.5){line([[faceX-2,top+14],[faceX,top+16],[faceX+3,top+14]],'ink')}else if(sad>.5){line([[faceX-2,top+16],[faceX,top+14],[faceX+2,top+16]],'ink')}else r(faceX-1,top+15,3,1,'ink')}}
 // White torso, blue shoulder yoke, zipper and cuffs: the same uniform on both characters.
 poly([[l+1+leanX,top+17],[rr-1+leanX,top+17],[rr,lower-1],[l,lower-1]],'white');r(l+1+leanX,top+17,w-2,3,'blue');r(l+1,top+20,3,Math.max(1,lower-top-21),'blueShade');
 if(!back){line([[faceX-3,top+17],[faceX,top+20],[faceX+3,top+17]],'white');r(faceX,top+21,1,Math.max(1,lower-top-22),'blue')}else r(faceX-7,top+22,14,2,'blueShade');
 for(const arm of[-1,1]){const root=[x+arm*half+leanX,top+17],active=arm===dir,extend=active?reach:0;let elbow=[root[0]+arm*5,root[1]+5],hand=[root[0]+arm*Math.round(6+6*extend),root[1]+6];if(walk){elbow[1]+=arm*step;hand[1]+=arm*step}if(active&&wave>0){elbow=[root[0]+arm*6,Math.round(mix(root[1]+5,root[1]-8,wave))];hand=[root[0]+arm*4,Math.round(mix(root[1]+6,root[1]-14,wave))]}if(sit>.5&&!wave){elbow=[root[0]+arm*2,root[1]+5];hand=[root[0]-arm*2,root[1]+8]}
  line([root,elbow,hand],'ink',3);line([[root[0],root[1]+1],[elbow[0],elbow[1]+1],hand],'white',1);r(hand[0]-1,hand[1],3,2,'blue');r(hand[0]+arm,hand[1],3,2,color)
 }
 if(pink)flower(rr-4+leanX,top-1);else{r(l+leanX,top-3,w,3,'blue');r(l+5+leanX,top-7,w-10,4,'blue');r(l+7+leanX,top-7,w-14,1,'blueShade');r(l+1+leanX,top-3,w-2,1,'white');r(faceX,top-9,2,2,'white')}
}
const dc=document.createElement('canvas');dc.width=1920;dc.height=1080;const dk=makeCtx(dc);
function depth(pink,x,y,t,scale,opts){if(scale>.999){actor(pink,x,y,t,opts);return}const old=k;k=dk;k.g.clearRect(0,0,320,180);actor(pink,72,72,t,opts);k=old;const w=Math.round(90*scale),h=Math.round(57*scale);k.g.drawImage(dk.lo,27,22,90,57,Math.round(x-w/2),Math.round(y-50*scale),w,h)}
function camera(scale=1,x=0,y=0){k.g.save();k.g.scale(scale,scale);k.g.translate(-Math.round(x),-Math.round(y))}function endCamera(){k.g.restore()}
const zoomCanvas=document.createElement('canvas');zoomCanvas.width=320;zoomCanvas.height=180;const zoomG=zoomCanvas.getContext('2d');function pixelCrop(x,y,w,h){zoomG.imageSmoothingEnabled=false;zoomG.clearRect(0,0,320,180);zoomG.drawImage(k.lo,x,y,w,h,0,0,320,180);k.g.clearRect(0,0,320,180);k.g.drawImage(zoomCanvas,0,0)}
function leaves(t,strong=false){for(let i=0;i<7;i++){let x=((i*47+t*(strong?24:8))%350)-15,y=96+(i*13)%58+Math.sin(t*2+i)*2;r(x,y,2,1,'warm');px(x+1,y+1,'deep')}}
function rain(t,n=80){for(let i=0;i<n;i++){let x=((i*43+t*24)%342)-11,y=(i*59+t*151)%180;line([[x,y],[x-1,y+4]],i%4?'fog':'mist')}for(let i=0;i<8;i++)if((Math.floor(t*8)+i)%4===0){const x=19+i*39,y=136+i%3*7;px(x-1,y,'fog');px(x+1,y,'fog')}}
function shadow(t){const shift=Math.round(Math.sin(t*1.5));poly([[24+shift,109],[75+shift,102],[106+shift,116],[60+shift,120]],'#956f64')}
function schoolWind(t){const q=Math.floor(t*6)%3-1;r(211,15,2,87,'#b9d2c2');r(303+q,15,2,87,'#b9d2c2');line([[246,124],[246+q,120],[251,118],[256,125]],'#89664c',1);const yy=67+Math.floor(Math.sin(t*1.8)*2);r(241,yy,30,2,'#89664c');line([[244,33],[243,yy]],'#637e85');line([[267,33],[268,yy]],'#637e85')}
function yellowFlower(t){const q=Math.round(Math.sin(t*2)),x=139+q,y=110;line([[141,124],[x+1,y+2]],'#527b6a');poly([[140,121],[144,118],[143,122]],'#719e74');r(x-3,y-1,2,2,'#e7cb79');r(x+2,y-1,2,2,'#fee761');r(x,y-4,2,3,'#fee761');r(x,y+1,2,3,'#e7cb79');r(x,y-1,2,2,'#b68f4f')}
function corridorPeople(t){const start=33.45,q=u(t,start,40.75),gx=104+15*s(t,start,35.5),pinkQ=s(t,start,40.75),pxx=166+101*pinkQ,py=149-37*pinkQ,scale=1-.46*pinkQ;
 actor(false,gx,151,t,{view:t<35?'quarter':'side',dir:1,walk:t<35.5,sad:1,look:2});depth(true,pxx,py,t,scale,{view:'back',dir:1,walk:true});return{px:pxx,py,scale,gx}}
const grainColors=new Set([P.fog,P.pale,P.mist,P.gray,P.wood,P.soft,P.paper,'#8195a6','#a6b7c5','#becbd2','#d7dedf','#a3acaa','#697b8c','#98a3b2','#b9b7bb','#d5c5b6','#8b8c92','#c6bdba','#a5bfd1','#c8d8df','#88b3cc','#c4dce0','#8f9bac','#d9b8a0'].map(c=>parseInt(c.slice(1),16)));
const grain=(t)=>{const q=Math.floor(t*8),data=k.g.getImageData(0,0,320,100).data;for(let i=0;i<45;i++){let x=hash(i,q)*320|0,y=hash(i+80,q)*95|0,idx=(y*320+x)*4,v=data[idx]*65536+data[idx+1]*256+data[idx+2];if(grainColors.has(v))px(x,y,data[idx]+data[idx+1]+data[idx+2]>480?'soft':'mist')}};
function shotAt(t){return shots.find(a=>t>=a[1]&&t<a[2])||shots.at(-1)}
function draw(t){k.g.setTransform(1,0,0,1,0,0);const sh=shotAt(t),id=sh[0];
 if(['L01','L02','L03'].includes(id)){const reach=s(t,2.65,5.3),turn=t<2.6?'front':t<3.4?'quarter':'side';if(id==='L02')camera(2,81,72);else if(id==='L03')camera(4,116,115);else camera();field('playground-gray',t);shadow(t);leaves(t);actor(false,122,145,t,{view:turn,dir:1,reach,look:2,lean:s(t,2.65,4.2)});actor(true,185,145,t,{view:t<3.7?'front':'quarter',dir:-1,look:t>3.4?-2:0});endCamera();}
 else if(['L04','L05','L06'].includes(id)){const q=s(t,5.85,12.6),pinkX=185+79*q,pinkY=145-29*q,scale=1-.58*q;
  if(id==='L05'){bg('railing');for(let i=0;i<9;i++){const xx=11+i*37,yy=25+(t*79+i*31)%123;r(xx,yy,2,4,'pale');px(xx-1,yy+2,'fog')}rain(t,48)}
  else{camera(id==='L04'?2:1,id==='L04'?81:0,id==='L04'?72:0);field('playground-gray',t);shadow(t);actor(false,122,145,t,{view:'side',dir:1,reach:1-s(t,5.55,8.4),sad:1});depth(true,pinkX,pinkY,t,scale,{view:t<6.15?'quarter':'back',dir:1,walk:t>6.15});rain(t,64+Math.floor(q*100));endCamera()}}
 else if(['L07','L08'].includes(id)){camera(id==='L08'?2:1,0,id==='L08'?78:0);bg('gate');actor(false,65,149,t,{view:t<14.6?'front':'quarter',dir:1,down:1-s(t,16.8,18.3),look:2,sad:1});rain(t,78);endCamera()}
 else if(id==='L09'){field('playground-clear',t);const q=s(t,20.25,23.7);poly([[136,4],[140,5],[149,28],[146,29]],'#e4d8b6');r(120+Math.round(q*2),12,15,3,'#b3c6cc');leaves(t)}
 else if(id==='L10'){camera(2,81,72);field('playground-clear',t);actor(false,122,145,t,{view:'front',dir:1,down:2*(1-s(t,23.7,24.7)),smile:t>25.4?1:0,squint:t>24.6?1:0});endCamera()}
 else if(['L11','L12','L13'].includes(id)){if(id==='L12')camera(4,108,96);else camera();bg('classroom');schoolWind(t);yellowFlower(t);endCamera();if(id==='L13')pixelCrop(64,20,256,144)}
 else if(['L14','L15','L16'].includes(id)){const q=s(t,33.45,40.75),x=166+101*q,y=149-37*q;if(id==='L14')camera(2,80,80);else if(id==='L15')camera(4,x-40,y-41);else camera();bg('corridor');corridorPeople(t);leaves(t,true);endCamera()}
 else{const close=['L18','L19'].includes(id);camera(close?2:1,close?81:0,close?81:0);field('playground-dusk',t);leaves(t);
  const lift=s(t,48.65,49.7),bye=s(t,49.8,50.35)*(1-s(t,51.15,51.9)),depart=s(t,51.3,55.55);actor(false,128,151,t,{sit:1,dir:1,view:t<45?'front':'quarter',look:2,smile:t<48.65?1:0,sad:t>=51?1:0,down:2*s(t,54.3,57),wave:.35*s(t,50.5,51.3)*(1-s(t,52,53.2))});
  if(t<55.5){const x=185+160*depart,y=151+3*lift;actor(true,x,y,t,{sit:1-lift,view:t<49.3?'front':t<50.1?'quarter':t<51.1?'side':'back',dir:t<50.1?-1:1,down:t>=45&&t<48.6?1:0,smile:t<49?1:0,wave:bye,walk:t>=51.3})}endCamera()}
 grain(t);if(t>=DUR-.93){const factor=Math.floor((1-u(t,DUR-.93,DUR))*12)/12,data=k.g.getImageData(0,0,320,180);for(let i=0;i<data.data.length;i+=4){data.data[i]=Math.round(data.data[i]*factor);data.data[i+1]=Math.round(data.data[i+1]*factor);data.data[i+2]=Math.round(data.data[i+2]*factor)}k.g.putImageData(data,0,0)}return sh;
}
const glyphs=new Map();
function subtitle(t){
 const q=captions.find(x=>t>=x[0]&&t<x[1]);if(!q)return;
 r(3,158,314,21,'ink');r(4,159,312,1,'gray');r(4,178,312,1,'deep');
 const label=q[2];
 if(/^[\x20-\x7e]*$/.test(label)){
   bitmapText(k,label,Math.round((320-textW(label))/2),165,P.white);return;
 }
 if(!glyphs.has(label)){
   const cv=document.createElement('canvas');cv.width=310;cv.height=17;
   const g=cv.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,310,17);
   g.font='13px '+project.captionFont;g.textAlign='center';g.textBaseline='top';g.fillStyle='#fff';g.fillText(label,155,0,306);
   const coords=[],data=g.getImageData(0,0,310,17).data;
   for(let y=0;y<17;y++)for(let x=0;x<310;x++)if(data[(y*310+x)*4]>110)coords.push([x,y]);
   glyphs.set(label,coords);
 }
 for(const[x,y]of glyphs.get(label))px(x+5,y+160,'white');
}
const blocking=new URLSearchParams(location.search).has('blocking');
function render(t,caption=true){t=Math.max(0,Math.min(DUR-1e-7,t));let q=blocking?(keys.filter(x=>x<=t).at(-1)||0):t;const sh=draw(q);if(caption)subtitle(t);main.present();return{time:t,shot:sh[0],blocking}}
window.DUR=DUR;window.render=render;window.READY=true;
window.PRODUCTION={revision:project.revision,duration:DUR,fps:project.fps,logical:[320,180],output:[project.width,project.width*9/16],captions,shots,actor:'yellow/pink blocks; white-blue tracksuit; cap/flower; four short legs',style:'colored native-pixel campus',audio:project.audio,normalSpeedAV:'requires human review'};
render(0);
