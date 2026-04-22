// Image proxy edge function — fetches external images server-side and returns
// them with permissive CORS headers so the browser canvas can read them
// without tainting (needed for embedding into PDFs).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic safety: only allow http(s) targets
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Unsupported protocol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: {
        // Some CDNs require a UA / referer
        "User-Agent": "Mozilla/5.0 (compatible; LSA-ImageProxy/1.0)",
        "Accept": "image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream ${upstream.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const buf = await upstream.arrayBuffer();

    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("image-proxy error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
