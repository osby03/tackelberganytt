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

const breakingTrack =
  document.querySelector("#breakingTrack");

if (breakingTrack) {

  const originalContent =
    breakingTrack.innerHTML;

  breakingTrack.innerHTML += originalContent;

}


/* ==========================================================
   PAUSA SENASTE NYTT NÄR MAN HÅLLER MUSEN ÖVER
========================================================== */

if (breakingTrack) {

  breakingTrack.addEventListener(
    "mouseenter",
    () => {
      breakingTrack.style.animationPlayState = "paused";
    }
  );

  breakingTrack.addEventListener(
    "mouseleave",
    () => {
      breakingTrack.style.animationPlayState = "running";
    }
  );

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