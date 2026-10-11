/* ==========================================================
   MOBILMENY
========================================================== */

const menuToggle = document.querySelector(".menu-toggle");
const menu = document.querySelector("#primary-menu");

if (menuToggle && menu) {

  menuToggle.addEventListener("click", () => {

    const isOpen = menu.classList.toggle("open");

    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

  });

}


/* ==========================================================
   MARKERA AKTIV SIDA
========================================================== */

const currentPage =
  window.location.pathname.split("/").pop() || "index.html";

document
  .querySelectorAll(".main-nav a")
  .forEach((link) => {

    const target = link.getAttribute("href");

    link.classList.toggle(
      "active",
      target === currentPage
    );

  });


/* ==========================================================
   SENASTE NYTT
========================================================== */

const breakingTrack = document.querySelector("#breakingTrack");
const cmsEscape = value => {const el=document.createElement("div"); el.textContent=String(value??""); return el.innerHTML;};
const cmsHref = a => "article.html?slug=" + encodeURIComponent(a.slug);
function duplicateTicker(){
  if (!breakingTrack || breakingTrack.dataset.duplicated) return;
  breakingTrack.innerHTML += breakingTrack.innerHTML;
  breakingTrack.dataset.duplicated="true";
}
if (breakingTrack) {
  breakingTrack.addEventListener("mouseenter",()=>breakingTrack.style.animationPlayState="paused");
  breakingTrack.addEventListener("mouseleave",()=>breakingTrack.style.animationPlayState="running");
}
async function loadHomeCMSArticles(){
  if (!document.querySelector(".homepage")) {duplicateTicker();return;}
  try {
    const response=await fetch("/.netlify/functions/articles",{cache:"no-store"});
    if (!response.ok) throw new Error("Kunde inte ladda nyheter");
    const articles=(await response.json()).filter(a=>a.status==="published");
    const lead=articles.find(a=>a.isLead);
    const hero=document.querySelector(".hero-news");
    if (lead && hero) {
      const href=cmsHref(lead),img=lead.image?`<img src="${cmsEscape(lead.image)}" alt="${cmsEscape(lead.title)}">`:"";
      hero.innerHTML=`<a href="${href}"><div class="hero-image-wrap">${img}<span class="hero-badge">HUVUDNYHET</span></div></a><div class="hero-content"><div class="story-category">${cmsEscape(lead.category)}</div><h1><a href="${href}">${cmsEscape(lead.title)}</a></h1><p class="hero-intro">${cmsEscape(lead.intro)}</p><div class="story-meta">${cmsEscape(lead.date)} • Av ${cmsEscape(lead.author)}</div></div>`;
    }
    const feed=document.querySelector("#cmsHomeFeed");
    if(feed && articles.length){
      feed.hidden=false;
      feed.innerHTML=articles.slice(0,8).map(a=>{const href=cmsHref(a);return `<article class="feed-story cms-feed-story">${a.image?`<a href="${href}"><img src="${cmsEscape(a.image)}" alt="${cmsEscape(a.title)}"></a>`:""}<div class="feed-story-content"><div class="story-category">${cmsEscape(a.category)}</div><h2><a href="${href}">${cmsEscape(a.title)}</a></h2><p>${cmsEscape(a.intro)}</p><a class="story-link" href="${href}">Läs mer →</a></div></article>`}).join("");
    }
    if(breakingTrack){
      const latest=articles.filter(a=>a.showLatest).slice(0,8);
      if(latest.length){
        const entries=latest.map(a=>{
          const clock=(a.updatedAt||a.createdAt||"");
          const time=clock?new Date(clock).toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"}):"NYTT";
          return `<a href="${cmsHref(a)}"><time>${time}</time> ${cmsEscape(a.title)}</a>`;
        }).join('<span class="breaking-dot">•</span>');
        breakingTrack.innerHTML=entries+'<span class="breaking-dot">•</span>'+breakingTrack.innerHTML;
      }
    }
  }catch(e){console.warn("Startsidan visar äldre nyheter:",e.message)}
  duplicateTicker();
}
loadHomeCMSArticles();

/* ==========================================================
   SPELARKOMMENTARER
========================================================== */

const commentSections =
  document.querySelectorAll(".player-comments");


commentSections.forEach((section) => {

  const player =
    section.dataset.player;

  const commentList =
    section.querySelector(".comment-list");

  const form =
    section.querySelector(".comment-form");

  const countElement =
    section.querySelector(".comment-count");

  const messageElement =
    section.querySelector(".comment-message");


  /*
  ==========================================
  HÄMTA KOMMENTARER
  ==========================================
  */

  async function loadComments() {

    try {

      const response =
        await fetch(
          `/.netlify/functions/comments?player=${encodeURIComponent(player)}`
        );


      if (!response.ok) {
        throw new Error("Kunde inte hämta kommentarer.");
      }


      const comments =
        await response.json();


      renderComments(comments);

    } catch (error) {

      commentList.innerHTML = `
        <p class="comments-error">
          Kommentarerna kunde inte laddas.
        </p>
      `;

    }

  }


  /*
  ==========================================
  VISA KOMMENTARER
  ==========================================
  */

  function renderComments(comments) {

    commentList.innerHTML = "";


    countElement.textContent =
      comments.length === 1
        ? "1 kommentar"
        : `${comments.length} kommentarer`;


    if (comments.length === 0) {

      commentList.innerHTML = `
        <p class="no-comments">
          Inga kommentarer ännu. Bli först att kommentera.
        </p>
      `;

      return;

    }


    comments.forEach((item) => {

      const comment =
        document.createElement("article");

      comment.className =
        "user-comment";


      const date =
        new Date(item.createdAt);


      const formattedDate =
        date.toLocaleString(
          "sv-SE",
          {
            dateStyle: "short",
            timeStyle: "short"
          }
        );


      const header =
        document.createElement("div");

      header.className =
        "user-comment-header";


      const name =
        document.createElement("strong");

      name.textContent =
        item.name;


      const time =
        document.createElement("time");

      time.textContent =
        formattedDate;


      const text =
        document.createElement("p");

      text.textContent =
        item.comment;


      header.append(
        name,
        time
      );


      comment.append(
        header,
        text
      );


      commentList.appendChild(
        comment
      );

    });

  }


  /*
  ==========================================
  SKICKA KOMMENTAR
  ==========================================
  */

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const submitButton =
        form.querySelector("button");


      const formData =
        new FormData(form);


      const name =
        formData.get("name");

      const comment =
        formData.get("comment");


      submitButton.disabled = true;

      submitButton.textContent =
        "Publicerar...";


      messageElement.textContent = "";


      try {

        const response =
          await fetch(
            "/.netlify/functions/comments",
            {

              method: "POST",

              headers: {
                "Content-Type": "application/json"
              },

              body: JSON.stringify({
                player,
                name,
                comment
              })

            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result.error ||
            "Kommentaren kunde inte sparas."
          );

        }


        form.reset();


        messageElement.textContent =
          "Kommentaren är publicerad.";


        await loadComments();

      } catch (error) {

        messageElement.textContent =
          error.message;

      } finally {

        submitButton.disabled = false;

        submitButton.textContent =
          "Publicera";

      }

    }
  );


  loadComments();

});
