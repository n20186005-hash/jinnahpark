import { defineMiddleware } from 'astro:middleware';
export const onRequest = defineMiddleware(async (context, next) => {
 const url = context.url;
 if (url.hostname === 'jinnahpark.com' && url.protocol === 'http:') {
  const target = new URL(url); target.protocol = 'https:';
  return Response.redirect(target.href, 308);
 }
 if (['/404', '/404.html'].includes(url.pathname)) return context.rewrite('/404/');
 const response = await next();
 if (response.status === 404 || url.pathname === '/404/') {
  const headers = new Headers(response.headers);
  headers.delete('Location'); headers.set('X-Robots-Tag', 'noindex'); headers.set('Cache-Control', 'no-store');
  return new Response(context.request.method === 'HEAD' ? null : response.body, { status: 404, headers });
 }
 return response;
});
