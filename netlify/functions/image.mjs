import { getStore } from "@netlify/blobs";


export default async function handler(request) {

  if (request.method !== "GET") {

    return new Response(
      "Method not allowed",
      {
        status: 405
      }
    );

  }


  const url =
    new URL(request.url);


  const key =
    url.searchParams.get("key");


  if (
    !key ||
    !key.startsWith("article-images/")
  ) {

    return new Response(
      "Invalid image",
      {
        status: 400
      }
    );

  }


  const store =
    getStore({
      name: "tackelberga-images",
      consistency: "strong"
    });


  const blob =
    await store.get(
      key,
      {
        type: "blob",
        consistency: "strong"
      }
    );


  if (!blob) {

    return new Response(
      "Image not found",
      {
        status: 404
      }
    );

  }


  const metadataEntry =
    await store.getMetadata(key);


  const contentType =
    metadataEntry?.metadata?.contentType ||
    blob.type ||
    "application/octet-stream";


  return new Response(
    blob,
    {
      headers: {

        "Content-Type":
          contentType,

        "Cache-Control":
          "public, max-age=31536000, immutable"

      }
    }
  );

}
