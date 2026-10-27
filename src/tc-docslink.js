/* Invoice / Bill -> the shop's own accounts (tc-docslink.js, loaded by tc-regdocs.js right after tc-docsprint.js).
   Owner's wish (2026-10-27): when a shop gives a bill, the sale must go into Sales by itself and the stock must go down; money received counts as
   income; what is not received yet must show in "Credit & dues" (to get).
   How: after EVERY change of a document (save, edit, payment added / cancelled, delete, made from a quotation) tc-docs.js calls tcDocsRebuild(id).
   It cancels the shop records this document made earlier (records carrying x.dk = the document id) and makes them again from the document as it is now,
   so an edit or a cancelled payment can never leave a wrong sale behind:
     - only lines whose text is the name (or other name) of a STOCK ITEM are recorded; labour / free text lines are not (a quotation is never recorded)
     - each stock line becomes a normal sale record {p,q,pr,pm,...}: pr = the line rate x (document total / subtotal), so the discount, the GST and the
       round off are inside the price and the sales add up to the document total (GST rate gr is set when the shop has GST on - the shop's prices are GST-inclusive)
     - paid in ONE payment equal to the total -> a direct sale: Cash / UPI (bank and other = Other)
     - otherwise (not paid, part paid, several payments) -> a CREDIT sale (pm 'K' + the customer's name, so it shows in Credit & dues > To get) and
       every payment is a 'money received' record (t:'rc') of the same customer, dated the day of the payment
     - if only some lines are stock items, payments are counted in the same proportion, so the customer's balance in Credit & dues stays right
     - a combo item keeps its recipe with the sale (like the Sale screen does)
   tcDocsNote(d) gives the little note shown on the document screen. Needs tc-shop.js and tc-docs.js. */
(function(){
 var SH=window.__tcShop, DX=window.__tcDocs;
 if(!SH||!DX||window.__tcDocsLink) return;
 window.__tcDocsLink=1;
 var r2=DX.r2, T=DX.T;
 function stockLines(d){
  var out=[], all=d.L||[];
  all.forEach(function(l){ var p=null; try{ p=SH.findName(l[0]); }catch(e){} out.push({l:l,p:p}); });
  return out;
 }
 window.tcDocsRebuild=function(id){
  SH.calc().live.forEach(function(r){
   if(r.x&&r.x.dk===id&&(r.k==="s"||(r.k==="o"&&r.x.t==="rc"))) SH.cancel(r.id);
  });
  var d=DX.get(id); if(!d||d.ty==="Q"||!(d.sub>0)) return;
  var S=stockLines(d).filter(function(x){ return x.p; }); if(!S.length) return;
  var factor=d.total/d.sub, lsub=0;
  S.forEach(function(x){ lsub+=r2((+x.l[1]||0)*(+x.l[3]||0)); });
  var lf=lsub/d.sub, direct=d.pays.length===1&&Math.abs(d.paid-d.total)<=0.5;
  var pm=direct?({U:"U",C:"C"}[d.pays[0].x.pm]||"O"):"K", g=SH.H.uid(), gst=SH.cfg("gst","0")==="1"&&d.gpct>0, credit=0;
  S.forEach(function(x){
   var rec={p:x.p.id,q:+x.l[1],pr:r2((+x.l[3]||0)*factor),pm:pm,g:g,dk:id};
   if(pm==="K"){ rec.cu=d.cn; credit+=r2(rec.q*rec.pr); }
   if(gst) rec.gr=d.gpct;
   if(x.p.comp) rec.rc=(x.p.rc||[]).map(function(c){ return {i:c.i,q:+c.q||0}; });
   SH.add("s",rec,d.d);
  });
  if(pm==="K"){
   var rs=[], sum=0;
   d.pays.forEach(function(r){ var a=r2((+r.x.a||0)*lf); if(a>0){ rs.push({r:r,a:a}); sum+=a; } });
   if(rs.length&&d.bal<=0.5) rs[rs.length-1].a=r2(rs[rs.length-1].a+credit-sum);   /* paid in full: no 1-paisa leftover in "to get" */
   rs.forEach(function(z){ if(z.a>0) SH.add("o",{t:"rc",cu:d.cn,a:z.a,pm:z.r.x.pm==="U"?"U":"C",dk:id},z.r.d); });
  }
 };
 window.tcDocsNote=function(d){
  if(d.ty==="Q") return "";
  var S=stockLines(d), n=S.filter(function(x){ return x.p; }).length; if(!n) return "";
  var other=S.length-n, E=DX.E;
  return '<div class="tdC tdM">📦 '+E(T(n+" ഇനം സെയിൽസിലും സ്റ്റോക്കിലും രേഖപ്പെടുത്തി"+(d.bal>0.5?"; കിട്ടാത്ത തുക 'കടം / കിട്ടാനുള്ളത്' ൽ ഉണ്ട്":"")+(other?" ("+other+" വരി സ്റ്റോക്കിൽ ഇല്ലാത്തത്, രേഖപ്പെടുത്തിയിട്ടില്ല)":"")+".",
   n+" item(s) recorded in Sales and stock"+(d.bal>0.5?"; the unpaid part is in Credit & dues":"")+(other?" ("+other+" line(s) not in stock are not recorded)":"")+"."))+'</div>';
 };
})();
