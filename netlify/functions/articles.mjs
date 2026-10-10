import { getStore } from "@netlify/blobs";

const articlesStore = () =>
  getStore({
    name: "tackelberga-articles",
    consistency: "strong"
  });

function json(data, status = 200) {
  return Response.json(data, { status });
}

function clean(value, max = 10000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function validSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
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
  const store = articlesStore();
  const url = new URL(request.url);

  /* ==========================================
     GET
  ========================================== */

  if (request.method === "GET") {
    const slug =
      clean(url.searchParams.get("slug"), 150);

    // Hämta en specifik artikel
    if (slug) {
      if (!validSlug(slug)) {
        return json(
          { error: "Ogiltig slug." },
          400
        );
      }

      const article =
        await store.get(
          `articles/${slug}`,
          {
            type: "json",
            consistency: "strong"
          }
        );

      if (!article) {
        return json(
          { error: "Artikeln finns inte." },
          404
        );
      }

      // Utkast får bara läsas från admin
      if (
        article.status !== "published" &&
        !isAuthorized(request)
      ) {
        return json(
          { error: "Artikeln finns inte." },
          404
        );
      }

      return json(article);
    }

    // Lista artiklar
    const result =
      await store.list({
        prefix: "articles/"
      });

    const articles = [];

    for (const blob of result.blobs) {
      const article =
        await store.get(
          blob.key,
          {
            type: "json",
            consistency: "strong"
          }
        );

      if (!article) {
        continue;
      }

      // Publikt: endast publicerade
      // Admin: publicerade + utkast
      if (
        article.status === "published" ||
        isAuthorized(request)
      ) {
        articles.push(article);
      }
    }

    articles.sort((a, b) => {
      const dateA =
        new Date(a.updatedAt || a.createdAt || a.date);

      const dateB =
        new Date(b.updatedAt || b.createdAt || b.date);

      return dateB - dateA;
    });

    return json(articles);
  }

  /* ==========================================
     POST
     SKAPA / UPPDATERA
  ========================================== */

  if (request.method === "POST") {
    if (!isAuthorized(request)) {
      return json(
        { error: "Fel redaktionslösenord." },
        401
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        { error: "Kunde inte läsa artikeln." },
        400
      );
    }

    const title =
      clean(body.title, 180);

    const slug =
      clean(body.slug, 150).toLowerCase();

    const originalSlug =
      clean(body.originalSlug, 150).toLowerCase();

    const category =
      clean(body.category, 50);

    const author =
      clean(body.author, 80);

    const date =
      clean(body.date, 20);

    const intro =
      clean(body.intro, 1000);

    const content =
      clean(body.content, 30000);

    const quote =
      clean(body.quote, 500);

    const quotePerson =
      clean(body.quotePerson, 100);

    const image =
      clean(body.image, 1000);

    const imageCaption =
      clean(body.imageCaption, 500);

    const status =
      body.status === "draft"
        ? "draft"
        : "published";

    if (
      !title ||
      !slug ||
      !category ||
      !author ||
      !date ||
      !intro ||
      !content
    ) {
      return json(
        {
          error:
            "Titel, slug, kategori, datum, författare, ingress och artikeltext krävs."
        },
        400
      );
    }

    if (!validSlug(slug)) {
      return json(
        {
          error:
            "Slug får bara innehålla små bokstäver, siffror och bindestreck."
        },
        400
      );
    }

    const existing =
      await store.get(
        `articles/${originalSlug || slug}`,
        {
          type: "json",
          consistency: "strong"
        }
      );

    /*
      Om slug ändras kontrollerar vi att den
      nya inte redan används.
    */
    if (
      originalSlug &&
      originalSlug !== slug
    ) {
      const slugCollision =
        await store.get(
          `articles/${slug}`,
          {
            type: "json",
            consistency: "strong"
          }
        );

      if (slugCollision) {
        return json(
          {
            error:
              "Det finns redan en artikel med den sluggen."
          },
          409
        );
      }
    }

    const now =
      new Date().toISOString();

    const article = {
      title,
      slug,
      category,
      author,
      date,
      intro,
      content,
      quote,
      quotePerson,
      image,
      imageCaption,

      showLatest:
        Boolean(body.showLatest),

      isLead:
        Boolean(body.isLead),

      status,

      createdAt:
        existing?.createdAt || now,

      updatedAt:
        now
    };

    await store.setJSON(
      `articles/${slug}`,
      article
    );

    /*
      Om redaktören ändrade slug måste
      gamla posten tas bort.
    */
    if (
      originalSlug &&
      originalSlug !== slug &&
      existing
    ) {
      await store.delete(
        `articles/${originalSlug}`
      );
    }

    return json(
      article,
      existing ? 200 : 201
    );
  }

  /* ==========================================
     DELETE
  ========================================== */

  if (request.method === "DELETE") {
    if (!isAuthorized(request)) {
      return json(
        { error: "Fel redaktionslösenord." },
        401
      );
    }

    const slug =
      clean(
        url.searchParams.get("slug"),
        150
      ).toLowerCase();

    if (!slug || !validSlug(slug)) {
      return json(
        { error: "Ogiltig artikel." },
        400
      );
    }

    const existing =
      await store.get(
        `articles/${slug}`,
        {
          type: "json",
          consistency: "strong"
        }
      );

    if (!existing) {
      return json(
        { error: "Artikeln finns inte." },
        404
      );
    }

    await store.delete(
      `articles/${slug}`
    );

    return json({
      success: true,
      slug
    });
  }

  return new Response(
    "Method not allowed",
    {
      status: 405
    }
  );
}
