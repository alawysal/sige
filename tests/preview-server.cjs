const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')){
  const upstream=http.request({hostname:'127.0.0.1',port:8080,path:req.url,method:req.method,headers:req.headers},answer=>{res.writeHead(answer.statusCode,answer.headers);answer.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end('API unavailable');});req.pipe(upstream);return;
 }
 let pathname=req.url.split('?')[0];
 let file=pathname==='/reference.html'?path.join(root,'SIGE_RGB.html'):path.join(root,'frontend/dist/frontend',pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'frontend/dist/frontend/index.html');
 res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript','css':'text/css','ico':'image/x-icon'})[file.split('.').pop()]||'application/octet-stream');fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PREVIEW_PORT||4201),'127.0.0.1',()=>console.log('Preview and reference ready'));
