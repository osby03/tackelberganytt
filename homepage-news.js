/* Tackelberganytt: CMS-nyheter på startsidan.
   Visar endast publicerade artiklar. Om API:et inte svarar lämnas originalinnehållet kvar. */
(() => {
  const feed = document.querySelector('.main-feed');
  if (!feed) return;

  function dateValue(a) {
    const n = Date.parse(a.updatedAt || a.createdAt || a.date || '');
    return Number.isFinite(n) ? n : 0;
  }
  function link(a) { return 'article.html?slug=' + encodeURIComponent(a.slug); }
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = String(text);
    return n;
  }
  function image(src, alt) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    return img;
  }
  function renderFeed(a) {
    const article = el('article','feed-story cms-home-feed-story');
    const href = link(a);
    if (a.image) {
      const imageLink = el('a');
      imageLink.href = href;
      imageLink.append(image(a.image, a.title));
      article.append(imageLink);
    }
    const content = el('div','feed-story-content');
    content.append(el('div','story-category',a.category || 'NYHET'));
    const h2 = el('h2'); const title = el('a',null,a.title); title.href=href; h2.append(title);
    content.append(h2, el('p',null,a.intro || ''));
    const more = el('a','story-link','Läs mer →'); more.href = href;
    content.append(more); article.append(content);
    return article;
  }
  function renderHero(a) {
    const hero = document.querySelector('.hero-news');
    if (!hero) return;
    const href=link(a);
    const picLink=el('a');picLink.href=href;
    const wrap=el('div','hero-image-wrap');
    if (a.image) wrap.append(image(a.image,a.title));
    wrap.append(el('span','hero-badge','HUVUDNYHET'));
    picLink.append(wrap);
    const content=el('div','hero-content');
    content.append(el('div','story-category',a.category||'NYHET'));
    const h1=el('h1');const title=el('a',null,a.title);title.href=href;h1.append(title);
    content.append(h1,el('p','hero-intro',a.intro||''));
    const date=a.date ? new Date(a.date+'T12:00:00').toLocaleDateString('sv-SE',{day:'numeric',month:'long',year:'numeric'}) : '';
    content.append(el('div','story-meta',[date,a.author&&'Av '+a.author].filter(Boolean).join(' • ')));
    hero.replaceChildren(picLink,content);
  }
  function renderSide(a) {
    const side = document.querySelector('.top-side-news');
    if (!side) return;
    const href=link(a), card=el('article','top-side-card');
    if(a.image) {const photo=el('a');photo.href=href;photo.append(image(a.image,a.title));card.append(photo);}
    card.append(el('div','story-category',a.category||'NYHET'));
    const h2=el('h2'), title=el('a',null,a.title);title.href=href;h2.append(title);card.append(h2);
    card.append(el('p',null,a.intro||''));
    side.prepend(card);
    // Låt högerspalten ha max två artiklar, så layouten behålls.
    while(side.children.length>2)side.lastElementChild.remove();
  }
  async function loadHomepageNews(){
    try {
      const response=await fetch('/.netlify/functions/articles',{cache:'no-store'});
      if(!response.ok)throw new Error('Nyhetsflödet kunde inte laddas');
      const payload=await response.json();
      if(!Array.isArray(payload))return;
      const articles=payload.filter(a=>a&&a.status==='published'&&a.slug&&a.title)
        .sort((a,b)=>dateValue(b)-dateValue(a));
      if(!articles.length)return;
      const old=feed.querySelectorAll(':scope > .feed-story');
      // De statiska artiklarna används som reserv vid fel och när inga CMS-artiklar finns.
      const fragment=document.createDocumentFragment();
      articles.slice(0,6).forEach(a=>fragment.append(renderFeed(a)));
      const sectionHeading=feed.querySelector('.modern-section-heading');
      if(sectionHeading)sectionHeading.after(fragment);else feed.prepend(fragment);
      old.forEach(n=>n.remove());
      const lead=articles.find(a=>a.isLead);
      if(lead)renderHero(lead);
      const firstSide=articles.find(a=>!lead||a.slug!==lead.slug);
      if(firstSide)renderSide(firstSide);
      const headlines=articles.filter(a=>a.showLatest).slice(0,10);
      if(headlines.length){
        const base=Array.from(document.querySelectorAll('#breakingTrack > .ticker-group:nth-child(2) a'))
          .map(a=>({href:a.getAttribute('href'),title:a.textContent.replace(/^\s*\d{2}:\d{2}/,'').trim(),time:a.querySelector('time')?.textContent||''}));
        const add=headlines.map(a=>({href:link(a),title:a.title,time:'NYTT'}));
        window.dispatchEvent(new CustomEvent('tackelberga:news-updated',{detail:{headlines:[...add,...base]}}));
      }
    } catch(error) {console.warn('Tackelberganytt: kunde inte hämta CMS-nyheter.',error);}
  }
  loadHomepageNews();
})();
