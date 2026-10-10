import { getStore } from "@netlify/blobs";


const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp"
];


function json(data, status = 200) {
  return Response.json(
    data,
    { status }
  );
}


function isAuthorized(request) {

  const suppliedKey =
    request.headers.get("x-admin-key");

  const actualKey =
    process.env.ADMIN_SECRET;


  return Boolean(
    actualKey &&
    suppliedKey &&
    suppliedKey === actualKey
  );

}


export default async function handler(request) {

  if (request.method !== "POST") {

    return new Response(
      "Method not allowed",
      {
        status: 405
      }
    );

  }


  if (!isAuthorized(request)) {

    return json(
      {
        error:
          "Fel redaktionslösenord."
      },
      401
    );

  }


  const form =
    await request.formData();


  const file =
    form.get("file");


  if (!(file instanceof File)) {

    return json(
      {
        error:
          "Ingen bildfil mottogs."
      },
      400
    );

  }


  if (!allowedTypes.includes(file.type)) {

    return json(
      {
        error:
          "Endast JPG, PNG och WebP är tillåtna."
      },
      400
    );

  }


  /*
    Max 5 MB
  */

  if (file.size > 5 * 1024 * 1024) {

    return json(
      {
        error:
          "Bilden får maximalt vara 5 MB."
      },
      400
    );

  }


  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";


  const id =
    crypto.randomUUID();


  const key =
    `article-images/${id}.${extension}`;


  const store =
    getStore({
      name: "tackelberga-images",
      consistency: "strong"
    });


  await store.set(
    key,
    file,
    {
      metadata: {
        contentType:
          file.type,

        originalName:
          file.name
      }
    }
  );


  const imageUrl =
    `/.netlify/functions/image?key=${encodeURIComponent(key)}`;


  return json({
    key,
    url: imageUrl
  });

}
