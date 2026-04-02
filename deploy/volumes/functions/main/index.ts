// Minimal Edge Runtime service to keep the functions container healthy.
// This project does not currently depend on deployed edge functions.

Deno.serve(() => {
  return new Response(
    JSON.stringify({ ok: true, service: "pulsos-supabase-functions" }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
});