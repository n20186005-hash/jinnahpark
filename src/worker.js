import astroWorker from '@astrojs/cloudflare/entrypoints/server';
export default { fetch(request, env, context) {
 const url = new URL(request.url);
 if (url.hostname === 'www.jinnahpark.com' || (url.hostname === 'jinnahpark.com' && url.protocol === 'http:')) {
  url.protocol = 'https:'; url.hostname = 'jinnahpark.com'; return Response.redirect(url.href, 308);
 }
 return astroWorker.fetch(request, env, context);
} };
