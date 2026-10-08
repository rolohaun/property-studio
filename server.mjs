import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('./docs/',import.meta.url));
const host=process.argv.find(arg=>arg.startsWith('--host='))?.slice(7)||'127.0.0.1';
const port=Number(process.env.PORT)||5174;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.pdf':'application/pdf','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  const relative=path.relative(root,target);
  if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403).end();return;}
  const body=await readFile(target);
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end('Not found');}
});
server.on('error',error=>{console.error(`Could not start Property Studio: ${error.message}`);process.exitCode=1;});
server.listen(port,host,()=>console.log(`${host==='127.0.0.1'?'Local':'Network'}: http://${host}:${port}`));
