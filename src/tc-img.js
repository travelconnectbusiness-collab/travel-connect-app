/* tc-img.js - shrinks big phone photos on the phone BEFORE they are uploaded, so the free 10 GB of file storage
   lasts for years instead of months. A 4-6 MB camera photo becomes about 0.4-0.7 MB (still sharp enough to read
   an RC / insurance paper). It works for every upload in the app (vehicle documents, logo, verification photos)
   by wrapping fetch(): any FormData with a big JPEG/PNG/WebP picture gets that picture replaced by a smaller one.
   Small pictures (< 350 KB), videos, PDFs and everything else are sent exactly as they were. If anything goes
   wrong the ORIGINAL file is sent - an upload is never blocked by this script. */
(function(){
 if(window.__tcImgShrink||typeof window.fetch!=="function") return;
 window.__tcImgShrink=true;
 var origFetch=window.fetch.bind(window);
 var MIN_BYTES=350*1024;            /* smaller files are left alone */
 var DOC_SIDE=2000, LOGO_SIDE=900, MEDIA_SIDE=1280;  /* longest side in pixels (documents / logo / shop photo + ad posts) */
 var QUALITY=0.8;

 function isBig(v){
  return typeof File!=="undefined"&&v instanceof File&&/^image\/(jpeg|png|webp)$/.test(v.type)&&v.size>MIN_BYTES;
 }
 function withTimeout(p,ms,fallback){
  return new Promise(function(resolve){
   var done=false, t=setTimeout(function(){ if(!done){ done=true; resolve(fallback); } },ms);
   p.then(function(v){ if(!done){ done=true; clearTimeout(t); resolve(v); } },function(){ if(!done){ done=true; clearTimeout(t); resolve(fallback); } });
  });
 }
 async function shrink(file,fieldName){
  var bmp;
  try{ bmp=await createImageBitmap(file,{imageOrientation:"from-image"}); }
  catch(e){ bmp=await createImageBitmap(file); }
  var max=/logo/i.test(fieldName)?LOGO_SIDE:/^media_/i.test(fieldName)?MEDIA_SIDE:DOC_SIDE;
  var k=Math.min(1,max/Math.max(bmp.width,bmp.height));
  var w=Math.max(1,Math.round(bmp.width*k)), h=Math.max(1,Math.round(bmp.height*k));
  var c=document.createElement("canvas"); c.width=w; c.height=h;
  var ctx=c.getContext("2d");
  var png=file.type==="image/png";
  if(!png){ ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h); } /* JPEG has no transparency */
  ctx.drawImage(bmp,0,0,w,h);
  if(bmp.close) bmp.close();
  var blob=await new Promise(function(r){ c.toBlob(r,png?"image/png":"image/jpeg",QUALITY); });
  if(!blob||blob.size>=file.size) return file;
  var base=(file.name||"photo").replace(/\.[^.]+$/,"")||"photo";
  return new File([blob],base+(png?".png":".jpg"),{type:png?"image/png":"image/jpeg"});
 }
 window.fetch=async function(input,init){
  try{
   var body=init&&init.body;
   if(body&&typeof FormData!=="undefined"&&body instanceof FormData){
    var entries=Array.from(body.entries());
    if(entries.some(function(e){ return isBig(e[1]); })){
     var fd=new FormData();
     for(var i=0;i<entries.length;i++){
      var name=entries[i][0], v=entries[i][1];
      if(isBig(v)){
       var small=await withTimeout(shrink(v,name),20000,v);
       fd.append(name,small,small.name||v.name);
      }else if(typeof File!=="undefined"&&v instanceof File) fd.append(name,v,v.name);
      else fd.append(name,v);
     }
     init=Object.assign({},init,{body:fd});
    }
   }
  }catch(e){ /* fall back to the original request */ }
  return origFetch(input,init);
 };
})();
