import { getStore } from '@netlify/blobs';
import { createHash, randomUUID } from 'node:crypto';
const s=()=>getStore({name:'tackelberga-article-community',consistency:'strong'});
const answer=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const pattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const clean=(v,max)=>String(v??'').trim().slice(0,max);
const hash=v=>createHash('sha256').update(v).digest('hex');
const validReaction=['laugh','cry','heart','fire','poop'];
const admin=req=>!!process.env.ADMIN_SECRET&&req.headers.get('x-admin-key')===process.env.ADMIN_SECRET;
async function all(store,prefix){let cursor,items=[];do{const p=await store.list({prefix,...(cursor?{cursor}:{})});items.push(...p.blobs);cursor=p.next_cursor;}while(cursor);return items;}
export default async function handler(req){
 try{
  const u=new URL(req.url),slug=clean(u.searchParams.get('slug'),150),store=s();
  if(!pattern.test(slug))return answer({error:'Ogiltig artikeladress.'},400);
  // Only allow commenting on actually published articles.
  const articles=getStore({name:'tackelberga-articles',consistency:'strong'});
  const article=await articles.get('articles/'+slug,{type:'json',consistency:'strong'});
  if(!article||article.status!=='published')return answer({error:'Artikeln är inte publicerad.'},404);
  const prefix='v1/'+slug+'/';
  if(req.method==='GET'){
   const [comments,reactions]=await Promise.all([all(store,prefix+'comments/'),all(store,prefix+'reactions/')]);
   const cc=(await Promise.all(comments.map(c=>store.get(c.key,{type:'json',consistency:'strong'})))).filter(Boolean);
   cc.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
   const totals=Object.fromEntries(validReaction.map(r=>[r,0]));
   const mine=clean(u.searchParams.get('device'),100);
   const mineHash=/^[a-f0-9-]{36}$/i.test(mine)?hash(mine):'';
   let myReaction=null;
   for(const entry of reactions){const r=await store.get(entry.key,{type:'json',consistency:'strong'});if(r&&validReaction.includes(r.reaction)){totals[r.reaction]++;if(mineHash&&entry.key.endsWith(mineHash))myReaction=r.reaction;}}
   return answer({reactions:totals,myReaction,comments:cc.map(({id,name,comment,createdAt})=>({id,name,comment,createdAt}))});
  }
  if(req.method==='DELETE'){
   if(!admin(req))return answer({error:'Åtkomst nekad.'},401);
   const id=clean(u.searchParams.get('id'),80);
   if(!/^[0-9a-f-]{36}$/i.test(id))return answer({error:'Ogiltigt kommentar-ID.'},400);
   await store.delete(prefix+'comments/'+id);return answer({ok:true});
  }
  if(req.method!=='POST')return answer({error:'Metoden stöds inte.'},405);
  let body;try{body=await req.json()}catch{return answer({error:'Felaktiga data.'},400)}
  if(u.searchParams.get('action')==='react'){
   const device=clean(body.device,100);
   if(!/^[0-9a-f-]{36}$/i.test(device))return answer({error:'Ogiltigt besökar-ID.'},400);
   const key=prefix+'reactions/'+hash(device);
   if(body.reaction===null){await store.delete(key);return answer({ok:true});}
   if(!validReaction.includes(body.reaction))return answer({error:'Okänd reaktion.'},400);
   await store.setJSON(key,{reaction:body.reaction});return answer({ok:true});
  }
  if(u.searchParams.get('action')==='comment'){
   if(clean(body.website,250))return answer({ok:true}); // spam honeypot
   const name=clean(body.name,60),comment=clean(body.comment,1500);
   if(name.length<2||comment.length<3)return answer({error:'Skriv namn och en kommentar.'},400);
   const id=randomUUID(),c={id,name,comment,createdAt:new Date().toISOString()};
   await store.setJSON(prefix+'comments/'+id,c);return answer(c,201);
  }
  return answer({error:'Okänd åtgärd.'},400);
 }catch(e){console.error(e);return answer({error:'Serverfel. Försök igen senare.'},500)}
}
