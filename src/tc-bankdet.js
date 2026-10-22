/* Bank account details on bills (tc-bankdet.js, loaded by tc-regdocs.js).
   Owner's request (2026-10-22): some customers do not use UPI (or the UPI QR does not work), so the bill can also carry the
   business bank account for NEFT / IMPS / RTGS transfer.
   1) Edit Billing Details: new boxes "Account holder name", "Bank & branch", "Account number", "IFSC code"
      (db.business.bankHolder / bankName / bankAc / bankIfsc). Same Plus/Premium switch as the UPI boxes. The account number
      (9-18 digits) and the IFSC code (4 letters, 0, 6 letters/digits) are checked before saving, so a wrong figure is not printed.
   2) The bank box is printed (print / image / PDF) under the Balance Due box of a bill that still has a balance, and with a quotation's
      "advance requested" box. A fully paid bill does not show it.
   3) On the bill screen a "Bank transfer" box (with Copy button) appears under the UPI QR while a balance is due; the Billing Details
      card also shows the saved bank details.
   Needs business.js to call window.tcBankHtml() (print) and window.tcBankPdf(doc,y,font) (PDF). */
(function(){
 if(window.__tcBankDet) return;
 window.__tcBankDet=1;
 function $(id){ return document.getElementById(id); }
 function E(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
 function bank(){
  var b=(typeof db!=="undefined"&&db.business)?db.business:{};
  if(!b.bankAc) return null;
  return {holder:b.bankHolder||b.upiName||b.name||"", name:b.bankName||"", ac:b.bankAc, ifsc:b.bankIfsc||""};
 }
 window.tcBankHtml=function(){
  var b=bank(); if(!b) return "";
  return '<div style="page-break-inside:avoid;background:#eef6fb;border:2px solid #9cc3dc;border-radius:8px;padding:10px 12px;margin-top:8px;font-size:14px;line-height:1.5">'+
   '<b style="font-size:14px;color:#1d5b82">BANK TRANSFER (NEFT / IMPS / RTGS)</b><br>'+
   (b.holder?'Account name: <b>'+E(b.holder)+'</b><br>':'')+
   'Account number: <b>'+E(b.ac)+'</b><br>'+
   (b.ifsc?'IFSC: <b>'+E(b.ifsc)+'</b><br>':'')+
   (b.name?'Bank: <b>'+E(b.name)+'</b>':'')+'</div>';
 };
 window.tcBankPdf=function(doc,y,font){
  var b=bank(); if(!b) return y;
  var fs=9; try{ var g=doc.getFontSize(); if(typeof g==="number") fs=g; }catch(e){}
  var lines=[];
  if(b.holder) lines.push("Account name: "+b.holder);
  lines.push("Account number: "+b.ac);
  if(b.ifsc) lines.push("IFSC: "+b.ifsc);
  if(b.name) lines.push("Bank: "+b.name);
  var h=9+lines.length*5;
  if(y+h>282){ doc.addPage(); y=18; }
  doc.setFillColor(238,246,251); doc.rect(15,y,180,h,"F");
  doc.setDrawColor(156,195,220); doc.rect(15,y,180,h); doc.setDrawColor(210);
  doc.setFont(font,"bold"); doc.setFontSize(9); doc.setTextColor(29,91,130);
  doc.text("BANK TRANSFER (NEFT / IMPS / RTGS)",20,y+6);
  doc.setFont(font,"normal"); doc.setTextColor(0);
  lines.forEach(function(l,i){ doc.text(l,20,y+11+i*5); });
  doc.setFontSize(fs);
  return y+h+4;
 };

 /* ---- Edit Billing Details ---- */
 function inject(){
  var up=$("bizUpiName"); if(!up||$("bizBankAc")) return;
  var on=typeof tcIsPremiumPlan==="function"?tcIsPremiumPlan():true;
  var dis=on?"":" disabled";
  var b=db.business||{};
  var grid=up.closest(".grid"); if(!grid) return;
  var d=document.createElement("div");
  d.innerHTML='<h4 style="margin:10px 0 2px">Bank account (for customers who do not use UPI)</h4>'+
   '<div class="grid">'+
   '<label>Account holder name<input id="bizBankHolder" value="'+E(b.bankHolder||"")+'"'+dis+'></label>'+
   '<label>Bank &amp; branch<input id="bizBankName" value="'+E(b.bankName||"")+'"'+dis+' placeholder="e.g. State Bank of India, Kannur"></label>'+
   '<label>Account number<input id="bizBankAc" inputmode="numeric" value="'+E(b.bankAc||"")+'"'+dis+'></label>'+
   '<label>IFSC code<input id="bizBankIfsc" value="'+E(b.bankIfsc||"")+'"'+dis+' placeholder="e.g. SBIN0001234"></label></div>'+
   '<div class="muted">Printed on bills that still have a balance, below the Balance Due box. Leave the account number empty to hide it.</div>';
  grid.parentNode.insertBefore(d,grid.nextSibling);
 }
 var oe=window.openEditBillingIdentity;
 if(typeof oe==="function") window.openEditBillingIdentity=function(){
  var r=oe.apply(this,arguments);
  try{ inject(); }catch(e){}
  return r;
 };
 var os=window.saveBillingIdentity;
 if(typeof os==="function") window.saveBillingIdentity=function(){
  var f=$("bizBankAc");
  if(f&&!f.disabled){
   var ac=f.value.replace(/[\s-]/g,""), ifsc=$("bizBankIfsc").value.replace(/\s/g,"").toUpperCase();
   if(ac&&!/^\d{9,18}$/.test(ac)){ toast("Account number should be 9 to 18 digits"); return; }
   if(ifsc&&!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)){ toast("IFSC code should be 11 characters, like SBIN0001234"); return; }
   if(ac&&!ifsc){ toast("Add the IFSC code too"); return; }
   if(!ac&&ifsc){ toast("Add the account number too"); return; }
   var upd={bankAc:ac,bankIfsc:ifsc,bankHolder:$("bizBankHolder").value.trim(),bankName:$("bizBankName").value.trim()};
   Object.assign(db.business,upd);
   return os.apply(this,arguments);
  }
  return os.apply(this,arguments);
 };
 /* Billing Details card: show the saved bank details */
 var orb=window.renderBillingIdentitySection;
 if(typeof orb==="function") window.renderBillingIdentitySection=function(){
  var r=orb.apply(this,arguments);
  try{
   var box=$("billingIdentityBody"), b=bank();
   if(box&&b&&!box.querySelector("#tcBankLine")){
    var line=document.createElement("div"); line.id="tcBankLine"; line.className="muted";
    line.textContent="Bank: "+(b.name?b.name+" - ":"")+"A/c "+b.ac+(b.ifsc?", IFSC "+b.ifsc:"");
    var up=Array.prototype.find.call(box.querySelectorAll(".muted"),function(x){ return /^UPI/.test(x.textContent); });
    if(up&&up.parentNode) up.parentNode.insertBefore(line,up.nextSibling); else box.appendChild(line);
   }
  }catch(e){}
  return r;
 };
 /* Bill screen: bank box under the UPI QR while a balance is due */
 window.tcBankCopy=function(){
  var b=bank(); if(!b) return;
  var t=(b.holder?"Account name: "+b.holder+"\n":"")+"Account number: "+b.ac+(b.ifsc?"\nIFSC: "+b.ifsc:"")+(b.name?"\nBank: "+b.name:"");
  try{ navigator.clipboard.writeText(t).then(function(){ toast("Bank details copied"); },function(){ toast("Could not copy"); }); }catch(e){ toast("Could not copy"); }
 };
 var ol=window.loadBill;
 if(typeof ol==="function") window.loadBill=function(){
  var r=ol.apply(this,arguments);
  try{
   var qr=$("billQR"), b=bank();
   if(qr&&b&&!$("tcBankBox")){
    qr.insertAdjacentHTML("afterend",'<div id="tcBankBox" class="ratebox" style="margin-top:8px"><b>Bank transfer</b>'+
     (b.holder?'<div>Account name: '+E(b.holder)+'</div>':'')+'<div>Account number: <b>'+E(b.ac)+'</b></div>'+
     (b.ifsc?'<div>IFSC: <b>'+E(b.ifsc)+'</b></div>':'')+(b.name?'<div>Bank: '+E(b.name)+'</div>':'')+
     '<div class="actions"><button onclick="tcBankCopy()">Copy bank details</button></div></div>');
   }
  }catch(e){}
  return r;
 };
})();
