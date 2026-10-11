// Tackelberganytt: artiklarnas reaktioner, delning och kommentarer
async function initEngagement(){
 const params=new URLSearchParams(location.search), slug=params.get('slug');
 if(!slug)return;
 const status=document.getElementById('engagementStatus'), container=document.getElementById('articleComments');
 const reactionWrap=document.getElementById('engagementReactions');
 const types=[['laugh','😂','Skratt'],['cry','😭','Gråt'],['heart','❤️','Hjärta'],['fire','🔥','Eld'],['poop','💩','Bajs']];
 const root='/.netlify/functions/article-community';
 const deviceKey='tb-community-device';
 let device=localStorage.getItem(deviceKey);
 if(!device){device=crypto.randomUUID();localStorage.setItem(deviceKey,device);}
 const escape=v=>{let d=document.createElement('div');d.textContent=String(v||'');return d.innerHTML;};
 let call=async(q,options={})=>{const response=await fetch(root+'?slug='+encodeURIComponent(slug)+q,{cache:'no-store',...options});let body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.error||'Något gick fel.');return body;};
 async function refresh(){try{
   const data=await call('');
   reactionWrap.innerHTML='';
   types.forEach(([key,emoji,label])=>{
     const button=document.createElement('button');button.type='button';button.className='reaction-button';
     const mine=data.myReaction===key;button.setAttribute('aria-pressed',String(mine));
     button.textContent=emoji+' '+(data.reactions[key]||0);button.title=label;
     button.addEventListener('click',async()=>{button.disabled=true;try{await call('&action=react',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reaction:mine?null:key,device})});await refresh();}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
     reactionWrap.appendChild(button);
   });
   container.innerHTML='';
   document.getElementById('articleCommentCount').textContent='('+data.comments.length+')';
   if(!data.comments.length)container.innerHTML='<p class="engagement-muted">Bli först att kommentera.</p>';
   data.comments.forEach(c=>{const el=document.createElement('article');el.className='engagement-comment';el.innerHTML='<div><strong>'+escape(c.name)+'</strong><time>'+new Date(c.createdAt).toLocaleString('sv-SE',{dateStyle:'medium',timeStyle:'short'})+'</time></div><p>'+escape(c.comment)+'</p>';container.appendChild(el)});
   status.textContent='';
 }catch(e){status.textContent='Kommentarer och reaktioner kunde inte laddas: '+e.message;}}
 // Fetch current user's reaction separately using device, not using shared public state.
 const oldRefresh=refresh;
 refresh=async()=>{ // use device identifier for personalized response
   const originalFetch=call;
   call=(q,opt={})=>originalFetch(q+(q===''?'&device=':'')+(q===''?encodeURIComponent(device):''),opt);
   await oldRefresh();call=originalFetch;
 };
 document.getElementById('articleCommentForm').addEventListener('submit',async e=>{
   e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Publicerar…';
   try{await call('&action=comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('commentName').value,comment:document.getElementById('commentBody').value,website:document.getElementById('commentWebsite').value})});form.reset();await refresh();}
   catch(e){status.textContent=e.message}finally{button.disabled=false;}
 });
 const url=location.href;
 document.getElementById('shareFacebook').href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
 document.getElementById('shareX').href='https://twitter.com/intent/tweet?url='+encodeURIComponent(url);
 document.getElementById('copyArticleLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url);status.textContent='Länken kopierad!'}catch{status.textContent='Kunde inte kopiera länken.'}});
 document.getElementById('shareNative').addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:document.title,url})}catch{}}else{try{await navigator.clipboard.writeText(url);status.textContent='Länken kopierad!'}catch{status.textContent='Kopiera adressen från webbläsaren.'}}});
 await refresh();
}
