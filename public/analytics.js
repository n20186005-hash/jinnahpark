(() => {
 const key='jp-cookie-consent',id='G-HXM22WWPKP';
 let enabled=false,initialized=false,deniedHere=false;
 const read=()=>JSON.parse(localStorage.getItem(key)||'{}').analytics===true;
 function command(){(window.dataLayer ||= []).push(arguments);}
 const apply=allow=>{
  enabled=allow;window['ga-disable-'+id]=!allow;
  if(!allow){
   if(window.dataLayer)command('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   for(const part of document.cookie.split(';')){const name=part.trim().split('=')[0];if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name))continue;for(const domain of ['',location.hostname,'.'+location.hostname])document.cookie=name+'=; Max-Age=0; path=/; SameSite=Lax'+(domain?'; domain='+domain:'');}
   return;
  }
  command('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  if(initialized)return;initialized=true;
  window.gtag=command;
  command('js',new Date());command('config',id,{anonymize_ip:true});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;script.dataset.jinnahGa='true';document.head.appendChild(script);
 };
 // An unsuccessful grant must not knowingly leave new permission in shared storage.
 const refuse=()=>{
  try{localStorage.setItem(key,JSON.stringify({necessary:true,analytics:false,preferences:false,marketing:false}));const value=localStorage.getItem(key);if(value!==null&&JSON.parse(value).analytics===false)return true;}catch{}
  try{localStorage.removeItem(key);if(localStorage.getItem(key)===null)return true;}catch{}
  return false;
 };
 window.jinnahAnalytics={get:()=>enabled,set:allow=>{
  if(!allow){deniedHere=true;apply(false);}
  try{
   // Check that the store can be read before attempting to publish permission.
   localStorage.getItem(key);
   localStorage.setItem(key,JSON.stringify({necessary:true,analytics:allow,preferences:false,marketing:false}));
   if(read()!==allow)throw new Error('Unconfirmed choice');
   if(allow){deniedHere=false;apply(true);}
   return {saved:true,effective:enabled,sharedOff:!allow};
  }catch{
   deniedHere=true;apply(false);
   const sharedOff=refuse();return {saved:!allow&&sharedOff,effective:false,sharedOff};
  }
 }};
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null){if(deniedHere){apply(false);return;}try{apply(read());}catch{apply(false);}}});
 try{apply(read());}catch{apply(false);}
})();
