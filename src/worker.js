import astroWorker from '@astrojs/cloudflare/entrypoints/server';
export default { fetch(request, env, context) {
 const url = new URL(request.url);
 if (url.hostname === 'jinnahpark.com' && url.protocol === 'http:') {
  url.protocol = 'https:'; return Response.redirect(url.href, 308);
 }
 return astroWorker.fetch(request, env, context);
} };
