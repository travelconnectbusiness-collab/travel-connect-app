/* Quotation / Invoice / Bill - printing and the way in (tc-docsprint.js, loaded by tc-regdocs.js right after tc-docs.js).
   1) tdPrint(id, asImage): the document as a printable page through business.js's printContent() - same platform strip + your branding box as the
      taxi bills, then: title (QUOTATION / INVOICE / CASH BILL; TAX INVOICE when you have a GSTIN and the document carries GST), number, date,
      "From" (your name, address, phone, GSTIN - always printed, so the paper is valid on its own), "Bill to", the item table, subtotal / discount / GST /
      round off / total, payments received and the balance with your UPI QR and bank box (tc-bankdet.js) while a balance is due, a quotation's validity
      and advance, notes, signature line. With "asImage" the page becomes a picture to share. "Print" gives Save-as-PDF on the phone. Malayalam text
      prints correctly this way (the jsPDF files of the taxi bills cannot draw Malayalam). tc-gst.js wording (CGST + SGST) applies on its own.
   2) tdWa(id): opens WhatsApp to the customer's number with a short text of the document.
   3) The way in: Menu entry "Quotation / Invoice / Bill" (shop, skilled work, workshop, pickup, homestay, restaurant), a card on the dashboard of a
      skilled work / workshop business (directly above Messages), and a button at the end of the shop's Home screen. */
(function(){
 var DX=window.__tcDocs;
 if(!DX||window.__tcDocsPrint) return;
 window.__tcDocsPrint=1;
 var E=DX.E, mny=DX.mny, r2=DX.r2, T=DX.T;
 var $=function(id){ return document.getElementById(id); };
 function dmy(s){ return String(s||"").split("-").reverse().join("-"); }
 function titleOf(d){
  var g=!!(DX.biz().gstin&&d.gst>0);
  return d.ty==="Q"?"QUOTATION":d.ty==="I"?(g?"TAX INVOICE":"INVOICE"):(g?"TAX INVOICE (CASH BILL)":"CASH BILL");
 }
 window.tdHtml=function(d){
  var b=DX.biz(), bb=(typeof db!=="undefined"&&db.business)||{}, plat=(typeof db!=="undefined"&&db.platform)||{};
  var partnerPhones=[bb.phone,bb.phone2].filter(Boolean).map(E).join(" &nbsp;|&nbsp; ");
  var platPhones=[plat.phone1,plat.phone2].filter(Boolean).map(E).join(" &nbsp;|&nbsp; ");
  var logo=""; try{ logo=typeof tcLogoUri==="function"?tcLogoUri():""; }catch(e){}
  var site=typeof TC_WEBSITE!=="undefined"?TC_WEBSITE:"travelconnect.dev";
  var strip='<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:6px"><div style="display:flex;align-items:center;gap:8px">'+
   (logo?'<img src="'+logo+'" style="width:28px;height:28px">':'')+'<div><div style="font-weight:bold;color:#444;font-size:13px">'+E(String(plat.name||"Travel Connect").toUpperCase())+'</div>'+
   (plat.tagline?'<div style="color:#888;font-size:10px">'+E(plat.tagline)+'</div>':'')+(plat.email?'<div style="color:#888;font-size:10px">'+E(plat.email)+'</div>':'')+
   '<div style="color:#888;font-size:10px">'+E(site)+'</div></div></div><div style="color:#444;font-weight:bold;font-size:12px;text-align:right">'+platPhones+'</div></div>';
  var brand=""; try{ brand=typeof tcBrandingBox==="function"?tcBrandingBox(partnerPhones):""; }catch(e){}
  var td='padding:5px 6px;border-bottom:1px solid #e5e5e5;font-size:14px;vertical-align:top';
  var rows=d.L.map(function(l,i){
   return '<tr><td style="'+td+';color:#888">'+(i+1)+'</td><td style="'+td+'">'+E(l[0])+'</td><td style="'+td+';text-align:right;white-space:nowrap">'+E(l[1])+(l[2]?' '+E(l[2]):'')+'</td>'+
    '<td style="'+td+';text-align:right;white-space:nowrap">'+mny(l[3])+'</td><td style="'+td+';text-align:right;white-space:nowrap"><b>'+mny(r2(l[1]*l[3]))+'</b></td></tr>';
  }).join("");
  function tr(a,v,bold,big){ return '<tr><td style="padding:3px 6px;color:#555;text-align:right">'+a+'</td><td style="padding:3px 6px;text-align:right;white-space:nowrap;'+(bold?'font-weight:bold;':'')+(big?'font-size:18px;':'')+'">'+v+'</td></tr>'; }
  var tot=tr("Subtotal",mny(d.sub))+(d.disc?tr("Discount","- "+mny(d.disc)):"")+(d.gst?tr("GST @ "+d.gpct+"%","+ "+mny(d.gst)):"")+(d.ro?tr("Round off",(d.ro>0?"+ ":"- ")+mny(Math.abs(d.ro))):"")+tr("TOTAL",mny(d.total),true,true);
  var money2="";
  if(d.ty!=="Q"){
   var qr=""; if(d.bal>0.5&&b.upi&&typeof getQRDataURL==="function"&&typeof buildUpiLink==="function"){ try{ var u=getQRDataURL(buildUpiLink(d.bal,d.no),190); if(u) qr='<div style="text-align:center"><b style="font-size:15px">SCAN &amp; PAY</b><br><img src="'+u+'" style="width:170px;height:170px"><br><small>UPI: '+E(b.upi)+'</small></div>'; }catch(e){} }
   money2=(d.pays.length?'<h3 style="margin:10px 0 4px;font-size:15px;color:#143c5a">Payments received</h3><table style="width:100%;border-collapse:collapse">'+d.pays.map(function(r){ return tr(({C:"Cash",U:"UPI",B:"Bank",O:"Other"}[r.x.pm]||"")+" ("+dmy(r.d)+")",mny(r.x.a)); }).join("")+tr("Total received",mny(d.paid),true)+'</table>':'')+
    '<div style="page-break-inside:avoid;background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:10px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div style="font-size:15px">Balance due: <b style="font-size:18px">'+(d.bal>0.5?mny(d.bal):"FULLY PAID")+'</b></div>'+qr+'</div>'+
    ((d.bal>0.5&&typeof window.tcBankHtml==="function")?window.tcBankHtml():"");
  }else{
   money2=(d.vu?'<div style="font-size:13px;color:#555;margin-top:8px">Valid until: <b>'+E(dmy(d.vu))+'</b></div>':'')+
    (d.ad?'<div style="page-break-inside:avoid;background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:10px;margin:10px 0;font-size:15px">Advance to pay: <b style="font-size:18px">'+mny(d.ad)+'</b></div>'+((typeof window.tcBankHtml==="function")?window.tcBankHtml():""):"");
  }
  return strip+brand+
   '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap"><h2 style="color:#143c5a;margin:4px 0;font-size:20px">'+titleOf(d)+'</h2><span style="color:#555;font-size:13px">No: <b>'+E(d.no)+'</b> &nbsp; Date: <b>'+E(dmy(d.d))+'</b></span></div>'+
   '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:6px 0">'+
   '<div style="flex:1;min-width:210px;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.5"><div style="color:#888;font-size:11px">FROM</div><b>'+E(b.name||"")+'</b>'+(b.addr?'<br>'+E(b.addr):'')+(b.ph?'<br>'+E(b.ph):'')+(b.gstin?'<br>GSTIN: <b>'+E(b.gstin)+'</b>':'')+'</div>'+
   '<div style="flex:1;min-width:210px;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.5"><div style="color:#888;font-size:11px">BILL TO</div><b>'+E(d.cn)+'</b>'+(d.ca?'<br>'+E(d.ca):'')+(d.cm?'<br>'+E(d.cm):'')+(d.cg?'<br>GSTIN: <b>'+E(d.cg)+'</b>':'')+'</div></div>'+
   (d.tt?'<div style="font-size:15px;margin:6px 0"><b>Work:</b> '+E(d.tt)+'</div>':'')+
   '<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr style="background:#eef3f7"><th style="'+td+';text-align:left">#</th><th style="'+td+';text-align:left">Description</th><th style="'+td+';text-align:right">Qty</th><th style="'+td+';text-align:right">Rate</th><th style="'+td+';text-align:right">Amount</th></tr>'+rows+'</table>'+
   '<table style="margin-left:auto;margin-top:6px;border-collapse:collapse">'+tot+'</table>'+money2+
   (d.nt?'<div style="background:#f6f6f6;border-radius:6px;padding:10px;margin-top:10px;font-size:12px;color:#444;white-space:pre-wrap">'+E(d.nt)+'</div>':'')+
   '<div style="margin-top:34px;text-align:right;font-size:13px;color:#444">For <b>'+E(b.name||"")+'</b><br><br><br>Authorised signatory</div>'+
   '<p style="text-align:center;color:#888;font-size:12px;margin-top:12px">Thank you'+(b.name?' - '+E(b.name):'')+'.</p>';
 };
 window.tdPrint=function(id,asImage){
  var d=DX.get(id); if(!d) return;
  try{ printContent(titleOf(d)+" "+d.no,window.tdHtml(d),!!asImage); }catch(e){ try{ toast("Could not open the print page"); }catch(x){} if(window.console) console.error("tc-docsprint",e); }
 };
 window.tdWa=function(id){
  var d=DX.get(id); if(!d) return;
  var b=DX.biz(), t="*"+titleOf(d)+" "+d.no+"*"+(b.name?"\n"+b.name:"")+"\n"+dmy(d.d)+"\n\n"+
   d.L.map(function(l){ return "- "+l[0]+": "+l[1]+(l[2]?" "+l[2]:"")+" x "+mny(l[3])+" = "+mny(r2(l[1]*l[3])); }).join("\n")+
   (d.disc?"\nDiscount: -"+mny(d.disc):"")+(d.gst?"\nGST @ "+d.gpct+"%: "+mny(d.gst):"")+"\n*Total: "+mny(d.total)+"*"+
   (d.ty!=="Q"?(d.bal>0.5?"\nBalance due: "+mny(d.bal):"\nPaid in full"):(d.vu?"\nValid until: "+dmy(d.vu):""))+(d.nt?"\n\n"+d.nt:"");
  var n=String(d.cm||"").replace(/\D/g,""); if(n.length===10) n="91"+n;
  try{ window.open("https://wa.me/"+n+"?text="+encodeURIComponent(t),"_blank"); }catch(e){}
 };

 /* ---------- the way in ---------- */
 var OKT={shop:1,skilled_work:1,workshop:1,pickup_goods:1,homestay:1,restaurant:1};
 function biz(){ try{ return window.__tcBizOnScreen?window.__tcBizOnScreen():""; }catch(e){ return ""; } }
 function notCustomer(){ try{ var u=getCurrentUser(); return !!u&&u.role!=="customer"; }catch(e){ return false; } }
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=$("modalBody");
   if(body&&notCustomer()&&OKT[biz()]&&!body.querySelector("#tcDocsMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcDocsMenu";
    wrap.innerHTML=tcMenuItem('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
     (typeof tcBl==="function"?tcBl("Quotation / Invoice / Bill","ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബിൽ"):"Quotation / Invoice / Bill"),"tcDocsOpen('list')");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };
 /* dashboard card: skilled work / workshop, directly above Messages */
 (function(){
  var tm=null;
  function make(){
   var c=document.createElement("div"); c.id="tcDocsCard";
   c.style.cssText="cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px;margin:2px 0 14px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#c9740c,#a35a06);box-shadow:0 2px 8px rgba(163,90,6,.3)";
   c.setAttribute("onclick","tcDocsOpen('list')");
   c.innerHTML='<div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">&#129534;</div>'+
    '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px">'+E(T("ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബിൽ","Quotation / Invoice / Bill"))+'</div>'+
    '<div style="font-size:12.5px;opacity:.95;line-height:1.35">'+E(T("കസ്റ്റമർക്ക് കൊടുക്കാൻ: GST, പണം, ബാക്കി, പ്രിന്റ്","For your customer: GST, payments, balance, print"))+'</div></div><div style="font-size:22px">&#8250;</div>';
   return c;
  }
  function place(){
   var c=$("tcDocsCard"), t=biz(), pb=$("partnerBox"), msg=pb?pb.querySelector("#tcMsgCard"):null;
   if(!(notCustomer()&&(t==="skilled_work"||t==="workshop")&&msg)){ if(c&&c.parentNode) c.remove(); return; }
   if(!c) c=make();
   if(c.nextElementSibling!==msg||c.parentNode!==msg.parentNode) msg.parentNode.insertBefore(c,msg);
  }
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ place(); }catch(e){ if(window.console) console.error("tc-docscard",e); } },150); }
  function start(){ var app=$("app"); if(!app||!window.MutationObserver) return; new MutationObserver(later).observe(app,{childList:true,subtree:true}); later(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();
 /* shop: a button at the end of the Home screen */
 (function(){
  var tm=null, watching=false;
  function put(){
   var UI=window.__tcShopUi, bd=UI&&UI.body&&UI.body();
   if(!bd||!UI.isOpen()||UI.screenName()!=="home"||$("tdHomeBtn")) return;
   var b=document.createElement("button"); b.id="tdHomeBtn"; b.className="tsBtn g"; b.style.marginTop="16px";
   b.setAttribute("onclick","tcDocsOpen('list')");
   b.textContent="🧾 "+T("ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബിൽ","Quotation / Invoice / Bill");
   bd.appendChild(b);
  }
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ put(); }catch(e){ if(window.console) console.error("tc-docshome",e); } },120); }
  function watch(){
   var bd=$("tsBody");
   if(bd&&!watching&&window.MutationObserver){ watching=true; new MutationObserver(later).observe(bd,{childList:true}); later(); }
  }
  function start(){
   if(!window.MutationObserver) return;
   watch();
   if(!watching) new MutationObserver(function(){ watch(); }).observe(document.body,{childList:true});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();
})();
