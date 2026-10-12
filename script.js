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
   SENASTE NYTT – AUTOMATISK RULLNING + FRI DRAGNING
   Fungerar med mus, touch och pekpenna.
========================================================== */

const breakingTrack = document.querySelector("#breakingTrack");
const breakingWindow = breakingTrack?.closest(".breaking-window");

if (breakingTrack && breakingWindow) {
  // Behåll originalnyheterna i en grupp och upprepa den på båda sidor.
  // Tre identiska grupper gör att man kan dra åt båda håll utan tomrum.
  const originalGroup = document.createElement("div");
  originalGroup.className = "ticker-group";
  while (breakingTrack.firstChild) {
    originalGroup.appendChild(breakingTrack.firstChild);
  }
  breakingTrack.appendChild(originalGroup);

  let before = originalGroup.cloneNode(true);
  let after = originalGroup.cloneNode(true);
  before.setAttribute("aria-hidden", "true");
  after.setAttribute("aria-hidden", "true");
  before.querySelectorAll("a").forEach(a => a.tabIndex = -1);
  after.querySelectorAll("a").forEach(a => a.tabIndex = -1);
  breakingTrack.prepend(before);
  breakingTrack.append(after);

  let groupWidth = 0;
  let offset = 0;
  let lastFrame = null;
  let pointerId = null;
  let lastPointerX = 0;
  let pointerStartX = 0;
  let dragged = false;
  let suppressClick = false;
  let mouseOver = false;
  let pageVisible = !document.hidden;
  const speed = 42; // pixlar per sekund
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function wrapOffset() {
    if (!groupWidth) return;
    // Håll oss inom mittgruppen utan att visningen hoppar.
    while (offset <= -2 * groupWidth) offset += groupWidth;
    while (offset > -groupWidth) offset -= groupWidth;
  }

  function paint() {
    breakingTrack.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  function measure() {
    const previousWidth = groupWidth;
    groupWidth = originalGroup.getBoundingClientRect().width;
    if (!groupWidth) return;
    if (!previousWidth) offset = -groupWidth;
    else offset = offset * (groupWidth / previousWidth);
    wrapOffset();
    paint();
  }

  function animate(timestamp) {
    if (lastFrame !== null && groupWidth && pointerId === null && !mouseOver && pageVisible && !reducedMotion.matches) {
      const delta = Math.min(timestamp - lastFrame, 60) / 1000;
      offset -= speed * delta;
      wrapOffset();
      paint();
    }
    lastFrame = timestamp;
    requestAnimationFrame(animate);
  }

  breakingWindow.addEventListener("pointerdown", event => {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    lastPointerX = pointerStartX = event.clientX;
    dragged = false;
    breakingWindow.classList.add("ticker-dragging");
    breakingWindow.setPointerCapture(event.pointerId);
  });

  breakingWindow.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId || !groupWidth) return;
    const dx = event.clientX - lastPointerX;
    lastPointerX = event.clientX;
    if (Math.abs(event.clientX - pointerStartX) > 6) dragged = true;
    if (dragged) {
      offset += dx;
      wrapOffset();
      paint();
    }
  });

  function finishDrag(event) {
    if (pointerId !== event.pointerId) return;
    if (dragged) suppressClick = true;
    pointerId = null;
    dragged = false;
    breakingWindow.classList.remove("ticker-dragging");
    if (breakingWindow.hasPointerCapture(event.pointerId)) {
      breakingWindow.releasePointerCapture(event.pointerId);
    }
    lastFrame = null;
  }
  breakingWindow.addEventListener("pointerup", finishDrag);
  breakingWindow.addEventListener("pointercancel", finishDrag);
  breakingWindow.addEventListener("lostpointercapture", event => {
    if (event.pointerId === pointerId) {
      pointerId = null;
      breakingWindow.classList.remove("ticker-dragging");
      lastFrame = null;
    }
  });
  breakingWindow.addEventListener("click", event => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }
  }, true);

  // På dator pausar remsan vid hovring, som tidigare.
  breakingWindow.addEventListener("mouseenter", event => {
    if (event.pointerType !== "touch") mouseOver = true;
  });
  breakingWindow.addEventListener("mouseleave", () => { mouseOver = false; });
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    lastFrame = null;
  });
  // Uppdatera remsan när CMS-artiklar har hämtats. Behåll dragning och animation.
  window.addEventListener("tackelberga:news-updated", event => {
    const headlines = event.detail?.headlines;
    if (!Array.isArray(headlines)) return;
    before.remove();
    after.remove();
    originalGroup.replaceChildren();
    for (const item of headlines) {
      const a = document.createElement("a");
      a.href = item.href;
      const time = document.createElement("time");
      time.textContent = item.time || "NYTT";
      a.append(time, document.createTextNode(" " + item.title));
      originalGroup.append(a);
      const dot = document.createElement("span");
      dot.className = "breaking-dot";
      dot.textContent = "•";
      originalGroup.append(dot);
    }
    before = originalGroup.cloneNode(true);
    after = originalGroup.cloneNode(true);
    before.setAttribute("aria-hidden", "true");
    after.setAttribute("aria-hidden", "true");
    for (const clone of [before, after]) clone.querySelectorAll("a").forEach(a => a.tabIndex = -1);
    breakingTrack.prepend(before);
    breakingTrack.append(after);
    groupWidth = 0;
    lastFrame = null;
    measure();
  });

  window.addEventListener("resize", measure);
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  measure();
  requestAnimationFrame(animate);
}


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
