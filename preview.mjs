import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.md':'text/plain; charset=utf-8','.wav':'audio/wav','.mp4':'video/mp4','.png':'image/png'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/demo.html':url.pathname));
  if(!file.startsWith(root+path.sep)||file.slice(root.length).split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403);return res.end()}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
  const size=fs.statSync(file).size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
  if(range){const start=Number(range[1]),end=range[2]?Math.min(size-1,Number(range[2])):size-1;
   if(start>end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end()}
   res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
   if(req.method==='HEAD')return res.end();return fs.createReadStream(file,{start,end}).pipe(res);
  }
  res.setHeader('Content-Length',size);if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end()}
});
server.listen(Number(process.env.PORT||8780),'127.0.0.1',()=>console.log(`Open http://127.0.0.1:${server.address().port}/demo.html; Ctrl+C to stop.`));
