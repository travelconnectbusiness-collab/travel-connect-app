/* Bill for a SALE (tc-salebill.js, loaded by tc-regdocs.js after tc-docsprint.js and tc-shopday.js).
   Owner's wish (2026-11-16): from the Sale screen itself, and later from any old sale, the customer can be given a bill - PDF, WhatsApp, printed on paper -
   without making a separate "Quotation / Invoice / Bill" document.
   - Sale screen: "Save and give bill" (next to Save); today's / the entered day's sales and the Report's day list have a small bill button on every sale;
     the edit sheet of a sale (Day book, tap a sale) gets "Bill / print again" on top. Any day later the same bill can be made again, it is rebuilt from the sale.
   - The bill is the same page as the Bill documents (tdHtml of tc-docsprint.js): your name, address, GSTIN, the items, GST split (CGST + SGST wording of tc-gst.js),
     how it was paid (cash / UPI / card ... part by part) and the balance when part was on credit. A bill number is made from the date and the sale's order that day (240115-3).
   - Buttons: Print / Save PDF (the phone's print page: a printer or "Save as PDF"), PDF file (share sheet - WhatsApp etc.), picture, WhatsApp message to the customer's number.
   - The customer name / mobile can be typed on the bill sheet for this bill (the sale itself is not changed).
   - The Travel Connect strip on top is shown by default; a Platinum member can switch it off (tcBrandToggleHtml in tc-docsprint.js) and bill under their own name only.
   Sales that came from a Quotation / Invoice / Bill (x.dk) already have their document, so no bill button there. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcSaleBill) return;
 window.__tcSaleBill=1;
 var H=SH.H, T=UI.T, E=UI.E, say=UI.say, r2=H.r2, $=function(id){ return document.getElementById(id); };
 var CUR=null;   /* the sale on the bill sheet: {key, cn, cm} */

 function groupOf(key){
  return SH.calc().live.filter(function(r){ return r.k==="s"&&(r.x.g||r.id)===key; }).sort(function(a,b){ return a.ts<b.ts?-1:a.ts>b.ts?1:0; });
 }
 /* a stable number: the date + the order of the sales of that day (by the time they were made) */
 function numberOf(key,d){
  var first={}, ord=[];
  SH.calc().live.forEach(function(r){ if(r.k==="s"&&r.d===d){ var k=r.x.g||r.id; if(first[k]===undefined){ first[k]=r.ts; ord.push(k); } else if(r.ts<first[k]) first[k]=r.ts; } });
  ord.sort(function(a,b){ return first[a]<first[b]?-1:first[a]>first[b]?1:0; });
  return d.slice(2,4)+d.slice(5,7)+d.slice(8,10)+"-"+(ord.indexOf(key)+1);
 }
 var PMN={C:"Cash",U:"UPI",D:"Card",B:"Bank",O:"Other"};
 /* the sale as the Bill document tdHtml() draws: item rows (GST-free rate when the sale carried GST), GST, total, what was received, what is still due */
 function saleDoc(key,cn,cm){
  var recs=groupOf(key); if(!recs.length) return null;
  var first=recs[0], x0=first.x, d=first.d, L=[], sub=0, gst=0, total=0, rates={}, parts={};
  recs.forEach(function(r){
   var x=r.x, p=SH.prod(x.p), q=+x.q||0, incl=+x.pr||0, tot=q*incl, gr=+x.gr>0?+x.gr:0, tax=gr?tot*gr/(100+gr):0, rate=gr?incl*100/(100+gr):incl;
   var row=[p?p.n:"Item",q,(p&&p.u)||"",r2(rate),""];
   L.push(row); sub+=r2(q*row[3]); gst+=tax; total+=tot; if(gr) rates[gr]=1;
   var pp=SH.pay(x,tot); Object.keys(pp).forEach(function(m){ parts[m]=(parts[m]||0)+pp[m]; });
  });
  sub=r2(sub); gst=r2(gst); total=r2(total);
  var pays=[], paid=0, due=r2(parts.K||0);
  Object.keys(parts).forEach(function(m){ if(m==="K"||!(parts[m]>0)) return; var a=r2(parts[m]); paid+=a; pays.push({d:d,x:{pm:m,a:a}}); });
  var gp=Object.keys(rates).sort(function(a,b){ return a-b; }).join("/");
  return {id:"sale-"+key,ty:due>0.5?"I":"B",no:numberOf(key,d),d:d,cn:cn||x0.cn||x0.cu||"",cm:cm||x0.cm||"",ca:"",cg:"",tt:"",L:L,sub:sub,disc:0,gst:gst,gpct:gp,ro:r2(total-sub-gst),total:total,
   pays:pays,paid:r2(paid),bal:due,vu:"",ad:0,nt:x0.no||"",conv:0};
 }
 window.tsBillDoc=saleDoc;   /* used by the test */

 function titleOf(d){ var g=!!(window.__tcDocs&&window.__tcDocs.biz().gstin&&d.gst>0); return d.ty==="I"?(g?"TAX INVOICE":"INVOICE"):(g?"TAX INVOICE (CASH BILL)":"CASH BILL"); }
 function cur(){
  if(!CUR) return null;
  var cn=$("sbCn"), cm=$("sbCm"); if(cn) CUR.cn=cn.value.trim(); if(cm) CUR.cm=cm.value.trim();
  return saleDoc(CUR.key,CUR.cn,CUR.cm);
 }
 function need(){ if(typeof window.tdHtml!=="function"){ say(T("ബില്ല് ഇപ്പോൾ ലഭ്യമല്ല - ആപ്പ് ഒന്ന് റീലോഡ് ചെയ്യൂ","The bill is not available - reload the app")); return false; } return true; }

 window.tsBillSheet=function(k){
  var key=decodeURIComponent(k||""), recs=groupOf(key);
  if(!recs.length) return;
  if(recs.some(function(r){ return r.x.dk; })){ say(T("ഇത് ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബില്ലിൽ നിന്നുള്ള വിൽപ്പനയാണ് - ബില്ല് അവിടെയുണ്ട്","This sale came from a Quotation / Invoice / Bill - the bill is there")); return; }
  if(!need()) return;
  CUR={key:key,cn:"",cm:""};
  var d=saleDoc(key,"",""), x0=recs[0].x;
  UI.sheet('<h3 style="margin:0 0 4px">🧾 '+E(T("ബില്ല്","Bill"))+' · '+E(d.no)+'</h3><div class="tsM">'+E(UI.dmy(d.d))+' · <b>'+H.money(d.total)+'</b>'+(d.bal>0.5?' · '+E(T("ബാക്കി ","due "))+H.money(d.bal):'')+'</div>'+
   '<div class="tsM" style="margin-top:2px">'+d.L.map(function(l){ return E(l[0])+' × '+H.qty(l[1]); }).join(', ')+'</div>'+
   '<label>'+E(T("കസ്റ്റമറുടെ പേര് (ബില്ലിൽ)","Customer name (on the bill)"))+'</label><input id="sbCn" maxlength="40" value="'+E(x0.cn||x0.cu||"")+'">'+
   '<label>'+E(T("മൊബൈൽ നമ്പർ (WhatsApp-ന്)","Mobile number (for WhatsApp)"))+'</label><input id="sbCm" type="tel" inputmode="tel" maxlength="15" value="'+E(x0.cm||"")+'">'+
   '<button class="tsBtn" onclick="tsBillGo(\'print\')">🖨 '+E(T("പ്രിന്റ് / PDF സേവ്","Print / Save PDF"))+'</button>'+
   (window.tcSharePdf?'<button class="tsBtn g" onclick="tsBillGo(\'pdf\')">📄 '+E(T("PDF ഫയൽ (ഷെയർ / സേവ്)","PDF file (share / save)"))+'</button>':'')+
   '<button class="tsBtn g" onclick="tsBillGo(\'img\')">🖼 '+E(T("ചിത്രമായി ഷെയർ ചെയ്യുക","Share as picture"))+'</button>'+
   '<button class="tsBtn g" onclick="tsBillGo(\'wa\')">💬 WhatsApp</button>'+
   (typeof window.tcBrandToggleHtml==="function"?window.tcBrandToggleHtml():'')+
   '<button class="tsBtn g" style="margin-top:10px" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };
 window.tsBillGo=function(act){
  var d=cur(); if(!d||!need()) return;
  var title=titleOf(d)+" "+d.no;
  if(act==="print"){ try{ printContent(title,window.tdHtml(d),false); }catch(e){ say(T("പ്രിന്റ് പേജ് തുറക്കാൻ പറ്റിയില്ല","Could not open the print page")); } return; }
  if(act==="img"){ try{ printContent(title,window.tdHtml(d),true); }catch(e){ say(T("ചിത്രം ഉണ്ടാക്കാൻ പറ്റിയില്ല","Could not make the picture")); } return; }
  if(act==="pdf"){ window.tcSharePdf(title,window.tdHtml(d),title); return; }
  if(act==="wa"){
   var DX=window.__tcDocs, b=DX?DX.biz():{}, mny=function(v){ return H.money(v); };
   var t="*"+title+"*"+(b.name?"\n"+b.name:"")+"\n"+UI.dmy(d.d)+"\n\n"+d.L.map(function(l){ return "- "+l[0]+": "+H.qty(l[1])+(l[2]?" "+l[2]:"")+" x "+mny(l[3])+" = "+mny(r2(l[1]*l[3])); }).join("\n")+
    (d.gst?"\nGST"+(d.gpct?" @ "+d.gpct+"%":"")+": "+mny(d.gst):"")+"\n*Total: "+mny(d.total)+"*"+
    (d.pays.length?"\nPaid: "+d.pays.map(function(p){ return (PMN[p.x.pm]||"")+" "+mny(p.x.a); }).join(", "):"")+(d.bal>0.5?"\nBalance due: "+mny(d.bal):"\nPaid in full")+(d.nt?"\n\n"+d.nt:"")+"\n\nThank you"+(b.name?" - "+b.name:"")+".";
   var n=String(d.cm||"").replace(/\D/g,""); if(n.length===10) n="91"+n;
   try{ window.open("https://wa.me/"+n+"?text="+encodeURIComponent(t),"_blank"); }catch(e){}
  }
 };

 /* the edit sheet of a sale (Day book): "Bill / print again" on top */
 var og=window.tsDySaleGo;
 if(typeof og==="function") window.tsDySaleGo=function(k){
  var r=og.apply(this,arguments);
  try{ setTimeout(function(){
   var sh=$("tsSheet"), box=sh&&sh.firstChild, key=decodeURIComponent(k||"");
   if(!box||box.querySelector("#tsBillTop")) return;
   var recs=groupOf(key); if(!recs.length||recs.some(function(x){ return x.x.dk; })) return;
   var b=document.createElement("button"); b.id="tsBillTop"; b.className="tsBtn"; b.style.marginTop="0"; b.innerHTML="🧾 "+E(T("ബില്ല് / വീണ്ടും പ്രിന്റ്","Bill / print again"));
   b.onclick=function(){ window.tsBillSheet(encodeURIComponent(key)); };
   box.insertBefore(b,box.firstChild);
  },40); }catch(e){}
  return r;
 };
})();
