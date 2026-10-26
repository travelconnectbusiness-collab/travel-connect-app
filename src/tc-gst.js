/* GST for taxi / travel bills (tc-gst.js, loaded by tc-regdocs.js).
   Owner's request (2026-10-26): GST must also be possible on the taxi / travel agency bills. Quotations already had an optional
   "Include GST" tick; what was missing: Quick Bill had no GST, a bill could not get GST afterwards, there was no place to enter the
   GSTIN, and nothing helped with the monthly GST figures. business.js is not edited - everything wraps its global functions.
   1) Edit Billing Details: new block "GST" - GSTIN (15 characters, checked), usual GST %, "New bills / quotations: I choose each time /
      Add GST automatically", "Show tax as: GST / CGST + SGST". Saved in db.business (gstin, gstDef, gstAuto, gstSplit).
   2) Quick Bill form: "GST" choice + GST % (ticked from the usual % when "add automatically" is on). Saved on the trip (gstSet/gstOn/gstPct).
   3) Quotation form: GST box is ticked with the usual % for a NEW quotation when "add automatically" is on (an opened quotation keeps its own).
   4) "Adjust Final Bill Amount": GST choice + % so any bill (quotation bill or Quick Bill) can get or lose GST. The trip's own choice
      (gstSet) wins over the quotation's: billFinalAmount() is wrapped so the quotation itself never changes.
   5) Print / image / PDF: with a GSTIN, bills that carry GST are titled TAX INVOICE and the GSTIN is shown in the PDF; with
      "CGST + SGST" the GST line reads "CGST 2.5% + SGST 2.5%" (same amount, split half each).
   6) Billing Details card shows the GSTIN and a "GST report" button: month-wise list of bills with GST (taxable value, GST, total), Copy button.
   GST is always ADDED on top of the fare (as the existing quotation GST does). */
(function(){
 if(window.__tcGst) return;
 window.__tcGst=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var RE=/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
 function B(){ return (typeof db!=="undefined"&&db.business)?db.business:{}; }
 function pct(v){ v=parseFloat(v); return (isFinite(v)&&v>0&&v<=100)?Math.round(v*100)/100:0; }
 function gstin(){ return String(B().gstin||"").replace(/\s/g,"").toUpperCase(); }
 function defPct(){ return pct(B().gstDef); }
 function auto(){ return !!B().gstAuto&&defPct()>0; }
 function half(p){ return Math.round(p/2*100)/100; }
 function tripOf(id){ return (db.trips||[]).filter(function(x){ return x.id===id; })[0]||null; }
 function quoteOf(t){ return t?((db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]||null):null; }
 function wrap(name,make){ var o=window[name]; if(typeof o==="function") window[name]=make(o); }

 /* ---- the trip's own GST choice wins over the quotation's ---- */
 wrap("billFinalAmount",function(o){ return function(t,q,c){
  if(t&&t.gstSet&&q) q=Object.assign({},q,{gstOn:!!t.gstOn,gstPct:t.gstOn?pct(t.gstPct):0});
  return o.call(this,t,q,c);
 }; });
 function billOf(t){
  var q=quoteOf(t); if(!q) return null;
  try{ return window.billFinalAmount(t,q,db.categories[q.categoryId]); }catch(e){ return null; }
 }

 /* ---- print / PDF wording ---- */
 window.tcGstFix=function(html){
  html=String(html==null?"":html);
  if(!/GST @ [\d.]+%/.test(html)) return html;
  if(B().gstSplit) html=html.replace(/GST @ ([\d.]+)%/g,function(m,p){ return "CGST "+half(+p)+"% + SGST "+half(+p)+"%"; });
  if(gstin()) html=html.replace("FINAL TRIP BILL","TAX INVOICE");
  return html;
 };
 wrap("printContent",function(o){ return function(t,h,a){ return o.call(this,t,window.tcGstFix(h),a); }; });
 wrap("pdfRow",function(o){ return function(doc,y,label,value){
  if(B().gstSplit){ var m=/^GST @ ([\d.]+)%$/.exec(String(label)); if(m) label="CGST "+half(+m[1])+"% + SGST "+half(+m[1])+"%"; }
  return o.call(this,doc,y,label,value);
 }; });
 wrap("downloadBillPDF",function(o){ return function(id){ window.__tcGstTrip=id; return o.apply(this,arguments); }; });
 function pdfBillHasGst(){
  var t=tripOf(window.__tcGstTrip), r=t?billOf(t):null;
  return !!(r&&r.gstAmount>0);
 }
 wrap("tcPdfBrandedHeader",function(o){ return function(doc,title){
  var tt=title;
  if(tt==="FINAL TRIP BILL"&&gstin()&&pdfBillHasGst()) tt="TAX INVOICE";
  var y=o.call(this,doc,tt), g=gstin();
  if(g){
   try{
    var fs=doc.getFontSize();
    doc.setFontSize(7.5); doc.setTextColor(60);
    doc.text("GSTIN: "+g,15,y-9);
    doc.setTextColor(0); doc.setFontSize(fs);
   }catch(e){}
  }
  return y;
 }; });

 /* ---- Edit Billing Details ---- */
 function injectBilling(){
  var sv=document.querySelector('button[onclick="saveBillingIdentity()"]');
  if(!sv||$("bizGstin")) return;
  var b=B(), d=document.createElement("div");
  d.innerHTML='<h4 style="margin:10px 0 2px">GST (only if you are GST-registered)</h4>'+
   '<div class="grid">'+
   '<label>GSTIN (15 characters)<input id="bizGstin" value="'+E(b.gstin||"")+'" placeholder="e.g. 32ABCDE1234F1Z5"></label>'+
   '<label>Usual GST % (e.g. 5)<input id="bizGstDef" type="number" min="0" max="100" step="0.01" value="'+E(b.gstDef||"")+'"></label>'+
   '<label>New bills and quotations<select id="bizGstAuto"><option value="0">I choose each time</option><option value="1"'+(b.gstAuto?" selected":"")+'>Add GST automatically</option></select></label>'+
   '<label>Show the tax as<select id="bizGstSplit"><option value="0">GST</option><option value="1"'+(b.gstSplit?" selected":"")+'>CGST + SGST (half each)</option></select></label></div>'+
   '<div class="muted">GST is added on top of the fare. With a GSTIN, a bill that carries GST is printed as TAX INVOICE. Ask your accountant which % applies to you.</div>';
  sv.parentNode.insertBefore(d,sv);
 }
 wrap("openEditBillingIdentity",function(o){ return function(){ var r=o.apply(this,arguments); try{ injectBilling(); }catch(e){} return r; }; });
 wrap("saveBillingIdentity",function(o){ return function(){
  var f=$("bizGstin");
  if(f){
   var g=f.value.replace(/\s/g,"").toUpperCase();
   if(g&&!RE.test(g)){ say("GSTIN should be 15 characters, like 32ABCDE1234F1Z5"); return; }
   var p=pct($("bizGstDef").value);
   Object.assign(db.business,{gstin:g,gstDef:p||"",gstAuto:$("bizGstAuto").value==="1"&&p>0,gstSplit:$("bizGstSplit").value==="1"});
   if($("bizGstAuto").value==="1"&&!p) say("Add GST automatically needs a usual GST %, so it was left off");
  }
  return o.apply(this,arguments);
 }; });
 wrap("renderBillingIdentitySection",function(o){ return function(){
  var r=o.apply(this,arguments);
  try{
   var box=$("billingIdentityBody");
   if(box&&!box.querySelector("#tcGstLine")){
    var g=gstin(), btn=box.querySelector('button[onclick="openEditBillingIdentity()"]');
    if(g){
     var line=document.createElement("div"); line.id="tcGstLine"; line.className="muted"; line.textContent="GSTIN: "+g+(defPct()?" ("+defPct()+"%)":"");
     var host=btn?btn.closest(".actions"):null;
     if(host&&host.parentNode) host.parentNode.insertBefore(line,host); else box.appendChild(line);
    }
    if(btn&&(g||defPct())){
     var b2=document.createElement("button"); b2.id="tcGstRepBtn"; b2.textContent="GST report"; b2.setAttribute("onclick","tcGstReport()");
     btn.parentNode.appendChild(b2);
    }
   }
  }catch(e){}
  return r;
 }; });

 /* ---- Quick Bill ---- */
 function gstRow(idSel,idPct,on,p){
  return '<div class="grid"><label>GST<select id="'+idSel+'"><option value="0">No GST</option><option value="1"'+(on?" selected":"")+'>Add GST on top of the fare</option></select></label>'+
   '<label>GST %<input id="'+idPct+'" type="number" min="0" max="100" step="0.01" value="'+E(p||"")+'" placeholder="e.g. 5"></label></div>';
 }
 wrap("openQuickBillForm",function(o){ return function(){
  var r=o.apply(this,arguments);
  try{
   var btn=document.querySelector('button[onclick="saveQuickBill()"]'), act=btn?btn.closest(".actions"):null;
   if(act&&!$("qbGst")){
    var d=document.createElement("div"); d.innerHTML=gstRow("qbGst","qbGstPct",auto(),defPct());
    act.parentNode.insertBefore(d,act);
   }
  }catch(e){}
  return r;
 }; });
 wrap("saveQuickBill",function(o){ return function(){
  var s=$("qbGst"), p=$("qbGstPct"), on=!!s&&s.value==="1", pc=p?pct(p.value):0;
  if(on&&!pc){ say("Enter the GST % (for example 5)"); return; }
  var n0=(db.trips||[]).length, id0=n0?db.trips[0].id:"";
  var r=o.apply(this,arguments);
  try{
   var t=db.trips[0];
   if(on&&t&&db.trips.length>n0&&t.id!==id0){ t.gstSet=1; t.gstOn=true; t.gstPct=pc; save(); }
  }catch(e){}
  return r;
 }; });

 /* ---- Quotation form: tick GST for a new quotation ---- */
 wrap("quotations",function(o){ return function(){
  var r=o.apply(this,arguments);
  try{
   if(auto()){
    var c=$("qGstOn"), p=$("qGstPct");
    if(c&&p&&!c.checked){ c.checked=true; p.disabled=false; p.value=defPct(); }
   }
  }catch(e){}
  return r;
 }; });

 /* ---- Adjust Final Bill Amount: GST for this bill ---- */
 wrap("openAdjustBill",function(o){ return function(tripId){
  var r=o.apply(this,arguments);
  try{
   var t=tripOf(tripId), cur=t?billOf(t):null, rd=$("adjRound"), grid=rd?rd.closest(".grid"):null;
   if(grid&&!$("adjGst")){
    var on=!!(cur&&cur.gstOn&&cur.gstPct>0), p=on?cur.gstPct:defPct();
    var d=document.createElement("div"); d.innerHTML=gstRow("adjGst","adjGstPct",on,p);
    grid.parentNode.insertBefore(d,grid.nextSibling);
   }
  }catch(e){}
  return r;
 }; });
 wrap("saveAdjustment",function(o){ return function(tripId){
  var s=$("adjGst"), p=$("adjGstPct");
  if(s&&p){
   var on=s.value==="1", pc=pct(p.value), t=tripOf(tripId);
   if(on&&!pc){ say("Enter the GST % (for example 5)"); return; }
   if(t){ t.gstSet=1; t.gstOn=on; t.gstPct=on?pc:0; }
  }
  return o.apply(this,arguments);
 }; });

 /* ---- GST report ---- */
 function rows(mon){
  var out=[], none=0;
  (db.trips||[]).forEach(function(t){
   if(t.status!=="completed") return;
   if((t.entryDate||t.startDate||"").slice(0,7)!==mon) return;
   var r=billOf(t); if(!r) return;
   if(!(r.gstAmount>0)){ none++; return; }
   out.push({no:t.billNo||"-",d:t.entryDate||t.startDate||"",cu:t.customer||"",pc:r.gstPct,tx:r.final-r.gstAmount,gs:r.gstAmount,tot:r.final});
  });
  out.sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; });
  return {list:out,none:none};
 }
 function money0(n){ return typeof money==="function"?money(n):"Rs."+n; }
 window.tcGstReport=function(mon){
  if(typeof mon!=="string"||!/^\d{4}-\d{2}$/.test(mon)) mon=new Date().toISOString().slice(0,7);
  var x=rows(mon), tx=0, gs=0, tot=0;
  x.list.forEach(function(r){ tx+=r.tx; gs+=r.gs; tot+=r.tot; });
  var h='<h2>GST report</h2><label>Month<input type="month" id="gstMon" value="'+mon+'" onchange="tcGstReport(this.value)"></label>';
  if(!x.list.length) h+='<p class="muted">No bills with GST in this month.</p>';
  else{
   h+='<div class="ratebox"><div>Bills with GST: <b>'+x.list.length+'</b></div><div>Taxable value: <b>'+money0(tx)+'</b></div><div>GST: <b>'+money0(gs)+'</b></div><div>Total billed: <b>'+money0(tot)+'</b></div></div>';
   h+=x.list.map(function(r){ return '<div class="listitem"><b>'+E(r.no)+'</b> - '+E(r.cu)+'<br><span class="muted">'+E(r.d)+' | taxable '+money0(r.tx)+' | GST '+r.pc+'% = '+money0(r.gs)+' | total '+money0(r.tot)+'</span></div>'; }).join("");
  }
  if(x.none) h+='<p class="muted">'+x.none+' bill(s) in this month without GST.</p>';
  h+='<div class="actions">'+(x.list.length?'<button onclick="tcGstCopy()">Copy</button>':'')+'<button onclick="closeModal()">Close</button></div>';
  window.__tcGstMon=mon;
  modal(h);
 };
 window.tcGstCopy=function(){
  var x=rows(window.__tcGstMon||new Date().toISOString().slice(0,7));
  var t="Bill\tDate\tCustomer\tTaxable\tGST %\tGST\tTotal\n"+x.list.map(function(r){ return [r.no,r.d,r.cu,r.tx,r.pc,r.gs,r.tot].join("\t"); }).join("\n");
  try{ navigator.clipboard.writeText(t).then(function(){ say("Copied"); },function(){ say("Could not copy"); }); }catch(e){ say("Could not copy"); }
 };
})();
