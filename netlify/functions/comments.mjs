import { getStore } from "@netlify/blobs";

const allowedPlayers = [
  "benson",
  "kebbeh",
  "fofana",
  "branby",
  "lehmann",
  "wagner"
];

function cleanText(value, maxLength) {
  return String(value || "")
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

export default async (request) => {

  const store = getStore({
    name: "tackelberga-comments",
    consistency: "strong"
  });

  const url = new URL(request.url);

  const player = cleanText(
    url.searchParams.get("player"),
    30
  );


  /*
  ==========================================
  GET – HÄMTA KOMMENTARER
  ==========================================
  */

  if (request.method === "GET") {

    if (!allowedPlayers.includes(player)) {

      return Response.json(
        {
          error: "Ogiltig spelare"
        },
        {
          status: 400
        }
      );

    }


    const result = await store.list({
      prefix: `${player}/`
    });


    const comments = [];


    for (const blob of result.blobs) {

      const comment = await store.get(
        blob.key,
        {
          type: "json",
          consistency: "strong"
        }
      );

      if (comment) {
        comments.push(comment);
      }

    }


    comments.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });


    return Response.json(comments);

  }


  /*
  ==========================================
  POST – SPARA NY KOMMENTAR
  ==========================================
  */

  if (request.method === "POST") {

    let body;

    try {

      body = await request.json();

    } catch {

      return Response.json(
        {
          error: "Ogiltig data"
        },
        {
          status: 400
        }
      );

    }


    const player = cleanText(body.player, 30);
    const name = cleanText(body.name, 30);
    const text = cleanText(body.comment, 300);


    if (!allowedPlayers.includes(player)) {

      return Response.json(
        {
          error: "Ogiltig spelare"
        },
        {
          status: 400
        }
      );

    }


    if (!name || !text) {

      return Response.json(
        {
          error: "Namn och kommentar krävs."
        },
        {
          status: 400
        }
      );

    }


    const id =
      `${Date.now()}-${crypto.randomUUID()}`;


    const comment = {

      id,
      player,
      name,
      comment: text,
      createdAt: new Date().toISOString()

    };


    await store.setJSON(
      `${player}/${id}`,
      comment
    );


    return Response.json(
      comment,
      {
        status: 201
      }
    );

  }


  return new Response(
    "Method not allowed",
    {
      status: 405
    }
  );

};