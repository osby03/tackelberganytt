import { getStore } from "@netlify/blobs";
const store = () => getStore({name:"tackelberga-articles",consistency:"strong"});
const respond = (body,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const clean = (v,max=30000) => String(v??"").trim().slice(0,max);
const validSlug = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const authorized = req => Boolean(process.env.ADMIN_SECRET && req.headers.get("x-admin-key") === process.env.ADMIN_SECRET);
const read = (s,key) => s.get(key,{type:"json",consistency:"strong"});
export default async function handler(req) {
  const url=new URL(req.url), s=store();
  try {
    if(req.method==="GET") {
      if(url.searchParams.get("adminCheck")==="1") return authorized(req)?respond({ok:true}):respond({error:"Fel redaktionslösenord."},401);
      const slug=clean(url.searchParams.get("slug"),150);
      if(slug) {
        if(!validSlug(slug)) return respond({error:"Ogiltig artikeladress."},400);
        const a=await read(s,`articles/${slug}`);
        return a && (a.status==="published" || authorized(req))?respond(a):respond({error:"Artikeln finns inte."},404);
      }
      let cursor; const articles=[];
      do {
        const page=await s.list({prefix:"articles/",...(cursor?{cursor}:{})});
        for(const entry of page.blobs) {
          const a=await read(s,entry.key);
          if(a && (a.status==="published" || authorized(req))) articles.push(a);
        }
        cursor=page.next_cursor;
      } while(cursor);
      articles.sort((a,b)=>new Date(b.updatedAt||b.createdAt||b.date)-new Date(a.updatedAt||a.createdAt||a.date));
      return respond(articles);
    }
    if(req.method!=="POST" && req.method!=="DELETE") return new Response("Method not allowed",{status:405});
    if(!authorized(req)) return respond({error:"Fel redaktionslösenord."},401);
    if(req.method==="DELETE") {
      const slug=clean(url.searchParams.get("slug"),150);
      if(!validSlug(slug))return respond({error:"Ogiltig slug."},400);
      if(!await read(s,`articles/${slug}`))return respond({error:"Artikeln finns inte."},404);
      await s.delete(`articles/${slug}`);
      return respond({success:true,slug});
    }
    let body; try {body=await req.json()}catch{return respond({error:"Ogiltig JSON."},400)}
    const a={
      title:clean(body.title,180),slug:clean(body.slug,150).toLowerCase(),
      category:clean(body.category,50),author:clean(body.author,80),date:clean(body.date,20),
      intro:clean(body.intro,1000),content:clean(body.content,30000),quote:clean(body.quote,500),
      quotePerson:clean(body.quotePerson,100),image:clean(body.image,1000),imageCaption:clean(body.imageCaption,500),
      factTitle:clean(body.factTitle,140),factText:clean(body.factText,2500),factImage:clean(body.factImage,1000),
      showLatest:Boolean(body.showLatest),isLead:Boolean(body.isLead),
      status:body.status==="draft"?"draft":"published",
      questions:Array.isArray(body.questions)?body.questions.slice(0,40).map(q=>({question:clean(q.question,500),answer:clean(q.answer,6000)})):[],
      columnConclusion:clean(body.columnConclusion,2500),profilePlayer:clean(body.profilePlayer,100),analysisSummary:clean(body.analysisSummary,2500)
    };
    const original=clean(body.originalSlug,150).toLowerCase();
    if(!validSlug(a.slug)|| (original && !validSlug(original)))return respond({error:"Ogiltig slug."},400);
    if(!a.title||!a.category||!a.date||!a.author||!a.intro || (!a.content && a.category!=="Intervju"))return respond({error:"Rubrik, kategori, datum, författare, ingress och artikeltext krävs (artikeltext är valfri vid intervju)."},400);
    if(a.questions.some(q=>!q.question || !q.answer))return respond({error:"Varje intervjufråga måste ha fråga och svar."},400);
    if(a.category==="Intervju"&&!a.questions.length && !a.content)return respond({error:"Intervjun behöver minst en fråga och ett svar."},400);
    const previous=original?await read(s,`articles/${original}`):await read(s,`articles/${a.slug}`);
    if(original && !previous)return respond({error:"Originalartikeln finns inte längre. Ladda om listan."},409);
    if((!original || original!==a.slug) && await read(s,`articles/${a.slug}`))return respond({error:"En artikel med den adressen finns redan."},409);
    const now=new Date().toISOString(); a.createdAt=previous?.createdAt||now; a.updatedAt=now;
    await s.setJSON(`articles/${a.slug}`,a);
    if(original && original!==a.slug)await s.delete(`articles/${original}`);
    return respond(a,previous?200:201);
  } catch(error) {console.error(error);return respond({error:"Serverfel vid hantering av artikel."},500)}
}
