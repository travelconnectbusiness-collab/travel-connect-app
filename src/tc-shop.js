/* Shop book - the data part (tc-shop.js, loaded by tc-regdocs.js). Screens are in tc-shopui.js / tc-shoprep.js / tc-shopimp.js.
   For the aquarium / pet shop (Mrithasanjeevani): products, sales, purchases (with transport shared over the bill), dead fish / loss,
   expenses, stock corrections. The book is a list of small records (never edited in place):
     p product  {i:productId,n:name,t:'f' fish|'i' item,c:category,pk:units per pack,pr:selling price,lo:low-stock mark,oq:opening qty,ov:opening value,al:other name,off:1 hidden,rc:[{i,q}] recipe}
     s sale     {p,q,pr,pm:'C'|'U',g:group}            b purchase {p,q,rt:rate per unit,tr:transport share,su:supplier,bn:bill no,g}
     m dead/loss {p,q,r}   e expense {c,a,t}   a stock correction {p,q:+/- units,r}   o owner money {t:'in'|'out',a,n}
     v cancel {r:id of the cancelled record}   c setting {k,v}
   Every record: {id,k,d:date YYYY-MM-DD,ts,x}. A correction = cancel (v) + new record. Records live in this phone (localStorage) and are sent to
   /api/shop (functions/api/shop.js) as soon as there is a connection, so the owner's phone and the shop's phone show the same book.
   Stock = opening + bought - sold - dead +/- corrections; cost per unit = average landing cost (opening value + bought value incl. transport
   share) / (opening + bought) - the same rule as the Google Sheet it replaces. Profit = sale price - that cost. */
(function(){
 if(window.__tcShop) return;
 window.__tcShop=1;
 var LSK="tc_shop_v1";
 var S={recs:{},q:[],cur:0,cfg:{},ver:0};
 var listeners=[], memo=null, status={s:"idle",pend:0,last:""}, busy=false, saveT=null, syncT=null, userKey="";

 /* ---------- small helpers ---------- */
 function uid(){ return "r"+Date.now().toString(36)+Math.random().toString(36).slice(2,9); }
 function pad(n){ return (n<10?"0":"")+n; }
 function today(){ var t=new Date(); return t.getFullYear()+"-"+pad(t.getMonth()+1)+"-"+pad(t.getDate()); }
 function addDays(iso,n){ var p=iso.split("-"), t=new Date(+p[0],+p[1]-1,+p[2]+n); return t.getFullYear()+"-"+pad(t.getMonth()+1)+"-"+pad(t.getDate()); }
 function nm(s){ return String(s==null?"":s).toLowerCase().replace(/\s+/g," ").trim(); }
 function r2(n){ return Math.round((+n||0)*100)/100; }
 function money(n){ n=Math.round(+n||0); return (n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN"); }
 function qty(n){ n=Math.round((+n||0)*1000)/1000; return String(n); }
 function me(){ try{ var u=getCurrentUser(); return u&&u.mobile?String(u.mobile):""; }catch(e){ return ""; } }

 /* ---------- store ---------- */
 function load(){
  userKey=me();
  S={recs:{},q:[],cur:0,cfg:{},ver:0};
  try{
   var j=JSON.parse(localStorage.getItem(LSK+":"+userKey)||"null");
   if(j&&j.recs){ S.recs=j.recs; S.q=j.q||[]; S.cur=j.cur||0; S.cfg=j.cfg||{}; }
  }catch(e){}
  S.ver++; memo=null;
 }
 function persist(){
  clearTimeout(saveT);
  saveT=setTimeout(function(){ try{ localStorage.setItem(LSK+":"+userKey,JSON.stringify({recs:S.recs,q:S.q,cur:S.cur,cfg:S.cfg})); }catch(e){} },300);
 }
 function changed(){ S.ver++; memo=null; persist(); listeners.forEach(function(f){ try{ f(); }catch(e){} }); }
 function guard(){ if(userKey!==me()) load(); }

 function add(k,x,d){
  guard();
  var r={id:uid(),k:k,d:d||today(),ts:new Date().toISOString(),x:x||{}};
  S.recs[r.id]=r; S.q.push(r.id); changed(); later();
  return r;
 }
 /* many records at once (import): each {id,k,d,ts,x}; an id that is already in the book is skipped; returns how many were new */
 function addMany(list){
  guard(); var n=0;
  list.forEach(function(r){ if(!r||!r.id||S.recs[r.id]) return; S.recs[r.id]={id:r.id,k:r.k,d:r.d||today(),ts:r.ts||new Date().toISOString(),x:r.x||{}}; S.q.push(r.id); n++; });
  if(n){ changed(); later(); }
  return n;
 }
 function cancel(id){ var r=S.recs[id]; if(!r||r.k==="v") return null; return add("v",{r:id},r.d); }
 function replace(id,x,d){ var r=S.recs[id]; if(!r) return null; cancel(id); return add(r.k,x,d||r.d); }
 function setCfg(k,v){ return add("c",{k:k,v:v}); }

 /* ---------- sync ---------- */
 function later(ms){ clearTimeout(syncT); syncT=setTimeout(sync,ms||2500); }
 function api(action,body){
  return fetch("/api/shop?action="+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){
   return r.json().catch(function(){ return {ok:false,error:"http_"+r.status}; }).then(function(j){ if(!j.ok&&!j.error) j.error="http_"+r.status; return j; });
  });
 }
 function setStatus(s){ status.s=s; status.pend=S.q.length; status.last=s==="ok"?new Date().toISOString():status.last; listeners.forEach(function(f){ try{ f("status"); }catch(e){} }); }
 async function sync(){
  guard();
  if(busy) return; if(!userKey) return;
  if(typeof navigator!=="undefined"&&navigator.onLine===false){ setStatus("off"); return; }
  busy=true; setStatus("busy");
  try{
   var guardN=0;
   while(S.q.length&&guardN++<60){
    var ids=S.q.slice(0,120), batch=ids.map(function(id){ return S.recs[id]; }).filter(Boolean);
    var j=await api("push",{records:batch.map(function(r){ return {id:r.id,k:r.k,d:r.d,ts:r.ts,x:r.x}; })});
    if(!j.ok) throw new Error(j.error||"push");
    S.q=S.q.filter(function(id){ return ids.indexOf(id)<0; });
    persist();
   }
   var more=true, n=0, got=0;
   while(more&&n++<80){
    var p=await api("pull",{since:S.cur});
    if(!p.ok) throw new Error(p.error||"pull");
    (p.rows||[]).forEach(function(r){
     if(!S.recs[r.id]){ S.recs[r.id]={id:r.id,k:r.k,d:r.d,ts:r.ts,x:r.x}; got++; }
     if(r.seq>S.cur) S.cur=r.seq;
    });
    more=!!p.more;
   }
   if(got){ changed(); } else persist();
   setStatus("ok");
  }catch(e){
   setStatus(String(e&&e.message).indexOf("device_unverified")>=0?"auth":"off");
  }finally{ busy=false; }
 }
 try{ window.addEventListener("online",function(){ later(500); }); }catch(e){}

 /* ---------- compute (memoised on S.ver) ---------- */
 var FISH_CATS={"Fish":1};
 var CATS=["Fish","Fish Food","Cat Food","Dog Food","Bird Food","Medicines","Accessories","Tank","Filters","Air Pump","Other"];
 var CAT_ML={"Fish":"മീൻ","Fish Food":"മീൻ തീറ്റ","Cat Food":"പൂച്ച ഭക്ഷണം","Dog Food":"നായ ഭക്ഷണം","Bird Food":"പക്ഷി തീറ്റ","Medicines":"മരുന്ന്","Accessories":"ആക്സസറീസ്","Tank":"ടാങ്ക് / ബൗൾ","Filters":"ഫിൽട്ടർ","Air Pump":"എയർ പമ്പ്","Other":"മറ്റുള്ളവ"};
 function cfgVal(c,k,def){ return c.hasOwnProperty(k)&&c[k]!==""&&c[k]!=null?c[k]:def; }
 function calc(){
  guard();
  if(memo&&memo.ver===S.ver) return memo;
  var ids=Object.keys(S.recs).map(function(i){ return S.recs[i]; });
  ids.sort(function(a,b){ return a.ts<b.ts?-1:a.ts>b.ts?1:(a.id<b.id?-1:1); });
  var voided={}; ids.forEach(function(r){ if(r.k==="v"&&r.x&&r.x.r) voided[r.x.r]=1; });
  var live=ids.filter(function(r){ return r.k!=="v"&&!voided[r.id]; });
  var cfg={}; live.forEach(function(r){ if(r.k==="c"&&r.x&&r.x.k) cfg[r.x.k]=r.x.v; });
  var prods={};
  live.forEach(function(r){
   if(r.k!=="p"||!r.x||!r.x.i) return;
   prods[r.x.i]=Object.assign({},prods[r.x.i]||{},r.x);
  });
  /* an item merged into another (one item typed under two names) or deleted: its records count for the other item / not at all */
  var MG={}, EX={}, GONE={};
  Object.keys(prods).forEach(function(i){ var p=prods[i]; if(p.dl) GONE[i]=1; else if(p.mg&&p.mg!==i&&prods[p.mg]&&!prods[p.mg].dl) MG[i]=p.mg; });
  function canon(i){ var n=0; while(MG[i]&&n++<10) i=MG[i]; return i; }
  Object.keys(MG).forEach(function(i){ var k=canon(i), p=prods[i], e=EX[k]||(EX[k]={oq:0,ov:0,als:[]}); e.oq+=+p.oq||0; e.ov+=+p.ov||0; if(p.n) e.als.push(p.n); if(p.al) e.als.push(p.al); });
  if(Object.keys(MG).length){
   live=live.map(function(r){
    var x=r.x; if(!x||!/^[bsma]$/.test(r.k)) return r;
    var np=x.p&&MG[x.p]?canon(x.p):x.p, rcm=x.rc&&x.rc.some(function(c){ return MG[c.i]; });
    if(np===x.p&&!rcm) return r;
    var y=Object.assign({},x,{p:np}); if(x.rc) y.rc=x.rc.map(function(c){ return {i:canon(c.i),q:c.q}; });
    return Object.assign({},r,{x:y});
   });
   Object.keys(prods).forEach(function(i){ if(prods[i].rc&&prods[i].rc.length) prods[i]=Object.assign({},prods[i],{rc:prods[i].rc.map(function(c){ return {i:canon(c.i),q:c.q}; })}); });
  }
  Object.keys(MG).forEach(function(i){ delete prods[i]; }); Object.keys(GONE).forEach(function(i){ delete prods[i]; });
  var A={}; Object.keys(prods).forEach(function(i){ A[i]={pq:0,pv:0,sq:0,sv:0,dq:0,adj:0,last:"",lastBuy:0}; });
  function acc(i){ return A[i]||(A[i]={pq:0,pv:0,sq:0,sv:0,dq:0,adj:0,last:"",lastBuy:0,missing:1}); }
  live.forEach(function(r){
   var x=r.x||{}, a;
   if(r.k==="b"&&x.p){ a=acc(x.p); a.pq+=+x.q||0; a.pv+=(+x.q||0)*(+x.rt||0)+(+x.tr||0); a.lastBuy=r.d>a.lastBuy?r.d:a.lastBuy; }
   else if(r.k==="s"&&x.p){
    var pr=prods[x.p];
    var rcs=x.rc&&x.rc.length?x.rc:(pr&&pr.rc&&pr.rc.length?pr.rc:null);   /* the sale keeps the recipe it was made with, so changing a recipe later never rewrites old stock */
    if(rcs){ rcs.forEach(function(c){ var b=acc(c.i); b.sq+=(+x.q||0)*(+c.q||0); if(r.d>b.last) b.last=r.d; }); }
    else { a=acc(x.p); a.sq+=+x.q||0; }
    a=acc(x.p); a.sv+=(+x.q||0)*(+x.pr||0); if(r.d>a.last) a.last=r.d;
   }
   else if(r.k==="m"&&x.p){ a=acc(x.p); a.dq+=+x.q||0; }
   else if(r.k==="a"&&x.p){ a=acc(x.p); a.adj+=+x.q||0; }
  });
  var P={};
  Object.keys(prods).forEach(function(i){
   var p=prods[i], a=A[i], ex=EX[i]||{oq:0,ov:0,als:[]}, oq=(+p.oq||0)+ex.oq, ov=(+p.ov||0)+ex.ov, den=(ov>0?oq:0)+a.pq;   /* opening stock without a known value does not pull the average cost down */
   var avg=den>0?(ov+a.pv)/den:0;
   P[i]={id:i,n:p.n||"?",t:p.t||"i",c:p.c||"Other",pk:+p.pk||1,pr:+p.pr||0,lo:p.lo===""||p.lo==null?null:+p.lo,oq:oq,ov:ov,al:p.al||"",als:ex.als,off:!!p.off,rc:p.rc||null,
    pq:a.pq,sq:a.sq,sv:a.sv,dq:a.dq,adj:a.adj,last:a.last,avg:avg,stock:oq+a.pq-a.sq-a.dq+a.adj,raw:p};
  });
  Object.keys(P).forEach(function(i){
   var p=P[i];
   if(p.rc&&p.rc.length){
    p.avg=p.rc.reduce(function(s,c){ var q=P[c.i]; return s+(q?q.avg:0)*(+c.q||0); },0); p.stock=null; p.comp=true;
    /* how many can still be made from the parts in stock */
    p.can=null; p.rc.forEach(function(c){ var q=P[c.i], n=(+c.q||0)>0&&q&&q.stock!=null?Math.max(0,Math.floor(q.stock/(+c.q)+1e-9)):null; if(n!=null&&(p.can==null||n<p.can)) p.can=n; });
   }
   p.value=p.stock!=null?Math.max(0,p.stock)*p.avg:0;
   p.low=p.stock!=null&&p.lo!=null&&p.stock<=p.lo;
   var mg=+cfgVal(cfg,"mg:"+p.c,p.t==="f"?100:50);
   p.sugg=p.avg>0?r2(p.avg*(1+mg/100)):0; p.mg=mg;
  });
  var unknown=Object.keys(A).filter(function(i){ return !P[i]; });
  memo={ver:S.ver,recs:ids,live:live,voided:voided,cfg:cfg,P:P,unknown:unknown};
  return memo;
 }

 function unitCost(x,P){
  if(x&&x.rc&&x.rc.length) return x.rc.reduce(function(s,c){ var q=P[c.i]; return s+(q?q.avg:0)*(+c.q||0); },0);
  var p=x&&P[x.p]; return p?p.avg:0;
 }
 function products(opt){
  opt=opt||{}; var M=calc();
  return Object.keys(M.P).map(function(i){ return M.P[i]; }).filter(function(p){
   if(!opt.all&&p.off) return false;
   if(opt.t&&p.t!==opt.t) return false;
   if(opt.noRc&&p.comp) return false;   /* a made-up item (soda + lime) is never bought or written off itself - only its parts are */
   return true;
  }).sort(function(a,b){ return nm(a.n)<nm(b.n)?-1:1; });
 }
 function prod(id){ return calc().P[id]||null; }
 function findName(name){ var k=nm(name); var L=products({all:true}); for(var i=0;i<L.length;i++) if(nm(L[i].n)===k||nm(L[i].al)===k||L[i].als.some(function(a){ return nm(a)===k; })) return L[i]; return null; }
 /* how much the book already uses an item (records + an opening stock): an unused item may be deleted, otherwise it is merged */
 function usage(id){ var p=prod(id); if(!p) return 0; var n=p.oq>0?1:0; calc().live.forEach(function(r){ if(r.x&&r.x.p===id&&/^[bsma]$/.test(r.k)) n++; if(r.x&&r.x.rc&&r.x.rc.some(function(c){ return c.i===id; })) n++; }); return n; }
 function search(q,opt){
  var k=nm(q), L=products(opt); if(!k) return L;
  var s1=[],s2=[],s3=[];
  L.forEach(function(p){
   var n=nm(p.n), a=nm(p.al);
   if(n.indexOf(k)===0||(a&&a.indexOf(k)===0)) s1.push(p);
   else if((" "+n).indexOf(" "+k)>=0||(a&&(" "+a).indexOf(" "+k)>=0)) s2.push(p);
   else if(n.indexOf(k)>=0||(a&&a.indexOf(k)>=0)) s3.push(p);
  });
  return s1.concat(s2,s3);
 }
 function categories(){
  var set={}; CATS.forEach(function(c){ set[c]=1; });
  products({all:true}).forEach(function(p){ if(p.c) set[p.c]=1; });
  return Object.keys(set);
 }
 function catName(c,ml){ return ml&&CAT_ML[c]?CAT_ML[c]:c; }
 function suppliers(){
  var set={}; calc().live.forEach(function(r){ if(r.k==="b"&&r.x.su){ var k=nm(r.x.su); if(k) set[k]=r.x.su.trim(); } });
  return Object.keys(set).map(function(k){ return set[k]; }).sort();
 }

 /* ---------- reports ---------- */
 function inRange(d,a,b){ return d>=a&&d<=b; }
 function report(d1,d2){
  var M=calc(), P=M.P, R={d1:d1,d2:d2,sales:0,cash:0,upi:0,other:0,cost:0,profit:0,lines:[],exp:0,expBy:{},expList:[],dead:0,deadQty:0,deadList:[],bought:0,wage:0,wagePaid:0,days:{}};
  M.live.forEach(function(r){
   if(!inRange(r.d,d1,d2)) return;
   var x=r.x||{}, p=P[x.p];
   if(r.k==="s"){
    var tot=(+x.q||0)*(+x.pr||0), cost=(+x.q||0)*unitCost(x,P);
    R.sales+=tot; R.cost+=cost;
    if(x.pm==="U") R.upi+=tot; else if(x.pm==="O") R.other+=tot; else R.cash+=tot;
    R.lines.push({r:r,p:p,tot:tot,cost:cost});
    R.days[r.d]=(R.days[r.d]||0)+tot;
   }else if(r.k==="e"){
    var a=+x.a||0; R.exp+=a; R.expBy[x.c||"Other"]=(R.expBy[x.c||"Other"]||0)+a; R.expList.push(r);
    if(x.c==="Wage") R.wagePaid+=a;
   }else if(r.k==="m"){
    var c=(+x.q||0)*(p?p.avg:0); R.dead+=c; R.deadQty+=+x.q||0; R.deadList.push({r:r,p:p,cost:c});
   }else if(r.k==="b"){
    R.bought+=(+x.q||0)*(+x.rt||0)+(+x.tr||0);
   }
  });
  R.profit=R.sales-R.cost; R.net=R.profit-R.exp-R.dead;
  var pct=+cfgVal(M.cfg,"wage",10);
  R.wage=Math.floor(R.sales/100)*pct;   /* Rs.10 for every full Rs.100 sold (the sheet's rule) */
  return R;
 }
 function stockValue(){ var t=0; products().forEach(function(p){ t+=p.value; }); return t; }
 function topSellers(n,days){
  var M=calc(), from=addDays(today(),-(days||45)), c={};
  M.live.forEach(function(r){ if(r.k==="s"&&r.d>=from&&r.x.p) c[r.x.p]=(c[r.x.p]||0)+1; });
  return Object.keys(c).sort(function(a,b){ return c[b]-c[a]; }).slice(0,n||8).map(function(i){ return M.P[i]; }).filter(function(p){ return p&&!p.off; });
 }

 /* ---------- product helpers ---------- */
 /* a new product record must carry its own id as product id BEFORE it is sent */
 function newProduct(x){
  guard();
  var id=uid();
  var r={id:id,k:"p",d:today(),ts:new Date().toISOString(),x:Object.assign({},x,{i:id})};
  S.recs[id]=r; S.q.push(id); changed(); later();
  return prod(id);
 }
 function onChange(f){ listeners.push(f); }
 function offChange(f){ listeners=listeners.filter(function(g){ return g!==f; }); }

 load();
 window.__tcShop={add:add,addMany:addMany,cancel:cancel,replace:replace,setCfg:setCfg,calc:calc,products:products,prod:prod,findName:findName,search:search,categories:categories,catName:catName,suppliers:suppliers,
  report:report,stockValue:stockValue,topSellers:topSellers,unitCost:unitCost,usage:usage,newProduct:newProduct,saveProduct:function(x){ return add("p",Object.assign({},(x.i&&prod(x.i)?prod(x.i).raw:{}),x)); },
  sync:sync,later:later,status:status,onChange:onChange,offChange:offChange,reload:load,
  H:{today:today,addDays:addDays,nm:nm,r2:r2,money:money,qty:qty,uid:uid,pad:pad},CATS:CATS,
  _S:function(){ return S; }};
})();
