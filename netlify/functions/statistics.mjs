import { getStore } from "@netlify/blobs";
const defaults={
  team:{wins:21,losses:42,otLosses:3,goalsFor:151,goalsAgainst:212,powerplay:17.8,boxplay:78.5},
  players:[
    {id:"kebbeh",name:"Suwaibo Kebbeh",position:"C",games:66,goals:56,assists:61,blocks:38,hits:288,pim:215},
    {id:"benson",name:"Bob Benson",position:"LW",games:66,goals:47,assists:67,blocks:37,hits:148,pim:134},
    {id:"fofana",name:"Ibrahima Fofana",position:"RD",games:66,goals:23,assists:37,blocks:104,hits:145,pim:213},
    {id:"branby",name:"Steinke Brånby",position:"LD",games:28,goals:0,assists:25,blocks:3,hits:4,pim:65}
  ]
};
const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const validInt=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000;
const validPercent=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=100;
export default async function handler(req) {
  try {
    const store=getStore({name:"tackelberga-statistics",consistency:"strong"});
    if(req.method==="GET") {
      const result=await store.get("current",{type:"json",consistency:"strong"});
      return json(result||defaults);
    }
    if(req.method!=="PUT")return new Response("Method not allowed",{status:405});
    if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-key")!==process.env.ADMIN_SECRET)return json({error:"Fel redaktionslösenord."},401);
    let body;try{body=await req.json()}catch{return json({error:"Ogiltig JSON."},400)}
    if(!body||!body.team||!Array.isArray(body.players))return json({error:"Ogiltig statistik."},400);
    const teamFields=["wins","losses","otLosses","goalsFor","goalsAgainst"];
    if(!teamFields.every(k=>validInt(body.team[k]))||!["powerplay","boxplay"].every(k=>validPercent(body.team[k])))return json({error:"Kontrollera lagets siffror."},400);
    if(body.players.length!==defaults.players.length)return json({error:"Fel antal spelare."},400);
    const players=[];
    for(const ref of defaults.players){
      const p=body.players.find(x=>x.id===ref.id);
      if(!p || !["games","goals","assists","blocks","hits","pim"].every(k=>validInt(p[k])))return json({error:`Kontrollera statistiken för ${ref.name}.`},400);
      players.push({...ref,games:p.games,goals:p.goals,assists:p.assists,blocks:p.blocks,hits:p.hits,pim:p.pim});
    }
    const team=Object.fromEntries([...teamFields,"powerplay","boxplay"].map(k=>[k,body.team[k]]));
    const result={team,players,updatedAt:new Date().toISOString()};
    await store.setJSON("current",result);
    return json(result);
  } catch(error){console.error(error);return json({error:"Kunde inte hantera statistiken."},500)}
}
