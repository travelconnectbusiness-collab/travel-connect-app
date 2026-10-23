/* Import from Excel / CSV (tc-import.js, loaded by tc-regdocs.js after tc-xlsx.js).
   "Import" button in Trip & Accounts (next to CSV): pick a .csv or .xlsx file (an old Excel/Google Sheet, or this app's own CSV),
   the app reads the first sheet, finds the header row and guesses what each column is (Date, Type, Category, Amount, or separate
   Income / Expense columns, Vehicle, Vehicle number, Customer, Route, Paid by, Litres, Note - English or Malayalam headings).
   Every guess can be changed in a drop-down before anything is saved. A preview shows how many rows are ready, the income and expense
   totals, the rows that are already in the book (skipped) and the rows that cannot be read (skipped, with the reason).
   Rows become ordinary book entries (marked imp:1 and with a batch number). "Undo last import" removes exactly that batch.
   .xlsx is read on the phone itself (zip + DecompressionStream, no library, offline); where the phone cannot do that, save the sheet as CSV.
   Dates: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, 12 Oct 2026 and Excel date numbers. Amounts: commas, Rs / rupee sign and (500) are understood. */
(function(){
 if(window.__tcImport) return;
 window.__tcImport=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var A=function(){ return window.__tcAbApi||null; };
 var nv=function(s){ return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,""); };
 var mny=function(n){ n=Math.round(+n||0); try{ return money(n); }catch(e){ return "Rs."+n; } };
 var p2=function(n){ return String(n).padStart(2,"0"); };

 /* ------------------------------------------------------------ file readers */
 function parseCsv(text){
  text=String(text||"").replace(/^﻿/,"");
  var first=text.split(/\r?\n/)[0]||"", cnt=function(c){ return first.split(c).length-1; };
  var d=",", best=cnt(","); if(cnt("\t")>best){ d="\t"; best=cnt("\t"); } if(cnt(";")>best){ d=";"; }
  var rows=[], row=[], cell="", q=false, i, c;
  for(i=0;i<text.length;i++){
   c=text[i];
   if(q){ if(c==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; }
   else if(c==='"') q=true;
   else if(c===d){ row.push(cell); cell=""; }
   else if(c==="\n"||c==="\r"){ if(c==="\r"&&text[i+1]==="\n") i++; row.push(cell); cell=""; rows.push(row); row=[]; }
   else cell+=c;
  }
  if(cell!==""||row.length){ row.push(cell); rows.push(row); }
  return rows.filter(function(r){ return r.some(function(x){ return String(x).trim()!==""; }); });
 }
 async function inflate(data){
  var s=new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
 }
 async function unzip(buf){
  var u8=new Uint8Array(buf), dv=new DataView(buf), n=u8.length, i, eocd=-1;
  for(i=n-22;i>=Math.max(0,n-65600);i--){ if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; } }
  if(eocd<0) throw new Error("not a zip");
  var cnt=dv.getUint16(eocd+10,true), p=dv.getUint32(eocd+16,true), files={}, dec=new TextDecoder();
  for(i=0;i<cnt;i++){
   if(dv.getUint32(p,true)!==0x02014b50) break;
   var method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), el=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lho=dv.getUint32(p+42,true);
   files[dec.decode(u8.subarray(p+46,p+46+nl))]={method:method,csize:csize,lho:lho};
   p+=46+nl+el+cl;
  }
  return {
   has:function(name){ return !!files[name]; },
   names:function(){ return Object.keys(files); },
   read:async function(name){
    var f=files[name]; if(!f) return null;
    var a=dv.getUint16(f.lho+26,true), b=dv.getUint16(f.lho+28,true), st=f.lho+30+a+b, raw=u8.slice(st,st+f.csize);
    var out=f.method===0?raw:await inflate(raw);
    return dec.decode(out);
   }
  };
 }
 function colIndex(ref){ var m=/^([A-Z]+)/.exec(ref||""), n=0; if(!m) return 0; for(var i=0;i<m[1].length;i++) n=n*26+(m[1].charCodeAt(i)-64); return n-1; }
 async function readXlsx(buf){
  var z=await unzip(buf), P=new DOMParser();
  var xml=function(t){ return P.parseFromString(t,"application/xml"); };
  var shared=[];
  if(z.has("xl/sharedStrings.xml")){
   var sx=xml(await z.read("xl/sharedStrings.xml"));
   Array.prototype.forEach.call(sx.getElementsByTagName("si"),function(si){
    var t=""; Array.prototype.forEach.call(si.getElementsByTagName("t"),function(x){ t+=x.textContent; }); shared.push(t);
   });
  }
  var wb=xml(await z.read("xl/workbook.xml")), rels=xml(await z.read("xl/_rels/workbook.xml.rels")), rmap={};
  Array.prototype.forEach.call(rels.getElementsByTagName("Relationship"),function(r){ rmap[r.getAttribute("Id")]=r.getAttribute("Target"); });
  var sheets=[];
  var list=wb.getElementsByTagName("sheet");
  for(var i=0;i<list.length;i++){
   var sh=list[i], rid=sh.getAttribute("r:id")||sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
   var tg=rmap[rid]; if(!tg) continue;
   tg=tg.replace(/^\//,""); if(tg.indexOf("xl/")!==0) tg="xl/"+tg;
   var sd=xml(await z.read(tg)), rows=[];
   Array.prototype.forEach.call(sd.getElementsByTagName("row"),function(r){
    var arr=[];
    Array.prototype.forEach.call(r.getElementsByTagName("c"),function(c){
     var ix=colIndex(c.getAttribute("r")), t=c.getAttribute("t"), v=c.getElementsByTagName("v")[0], val="";
     if(t==="inlineStr"){ Array.prototype.forEach.call(c.getElementsByTagName("t"),function(x){ val+=x.textContent; }); }
     else if(v){ val=v.textContent; if(t==="s") val=shared[+val]!=null?shared[+val]:""; }
     while(arr.length<ix) arr.push("");
     arr[ix]=val;
    });
    if(arr.some(function(x){ return String(x).trim()!==""; })) rows.push(arr);
   });
   if(rows.length) sheets.push({name:sh.getAttribute("name")||("Sheet"+(i+1)),rows:rows});
  }
  return sheets;
 }

 /* ------------------------------------------------------------ guessing */
 var FIELDS=[
  ["","- ignore -","- വേണ്ട -"],["date","Date","തീയതി"],["type","Type (in / out)","തരം (വരവ് / ചെലവ്)"],["cat","Category","വിഭാഗം"],["amount","Amount","തുക"],
  ["income","Income amount","വരവ് തുക"],["expense","Expense amount","ചെലവ് തുക"],["vehicle","Vehicle name","വാഹനം"],["vno","Vehicle number","വാഹന നമ്പർ"],
  ["customer","Customer","കസ്റ്റമർ"],["route","Route / place","റൂട്ട് / സ്ഥലം"],["mode","Paid by","പേയ്മെന്റ് രീതി"],["litres","Fuel litres","ഇന്ധനം ലിറ്റർ"],["note","Note","കുറിപ്പ്"]
 ];
 var SYN=[
  ["vno",/(vehicle|veh|car|gadi)\W*(no|num|number|reg)|reg(istration)?\W*(no|num)|^number$|നമ്പർ/i],
  ["date",/^\W*(date|day|trip date|entry date|dt)\W*$|തീയതി|ദിവസം/i],
  ["type",/^\W*(type|in\W*\/?\W*out|dr\W*\/?\W*cr|nature|വരവ്\W*\/\W*ചെലവ്|തരം)\W*$/i],
  ["cat",/categor|head|particular|expense type|income type|item|വിഭാഗം|ഇനം/i],
  ["income",/income|credit|received|receipt|\bin\b|വരവ്/i],
  ["expense",/expense|debit|spent|payment made|\bout\b|ചെലവ്/i],
  ["amount",/^\W*(amount|amt|total|rs|inr|value|rupees|തുക)\W*$|amount/i],
  ["litres",/litre|liter|ltr|qty|diesel qty|ലിറ്റർ/i],
  ["mode",/paid by|mode|method|payment|cash\W*upi/i],
  ["vehicle",/vehicle|veh|car|വാഹനം/i],
  ["customer",/customer|party|client|guest|name|കസ്റ്റമർ/i],
  ["route",/route|from|destination|place|trip|location|സ്ഥലം/i],
  ["note",/note|remark|narration|detail|description|comment|കുറിപ്പ്/i]
 ];
 function guessField(h){ h=String(h||"").trim(); if(!h) return ""; for(var i=0;i<SYN.length;i++){ if(SYN[i][1].test(h)) return SYN[i][0]; } return ""; }
 function findHeader(rows){
  var best=0, bestN=-1;
  for(var i=0;i<Math.min(15,rows.length);i++){
   var n=0, seen={}; rows[i].forEach(function(c){ var f=guessField(c); if(f&&!seen[f]){ seen[f]=1; n++; } });
   if(n>bestN){ bestN=n; best=i; }
   if(n>=3) return i;
  }
  return bestN>=2?best:0;
 }
 function guessMap(hdr){
  var map={}, used={};
  hdr.forEach(function(h,ix){ var f=guessField(h); if(f&&!used[f]){ used[f]=1; map[ix]=f; } });
  return map;
 }

 /* ------------------------------------------------------------ cell parsing */
 function parseDate(v){
  v=String(v==null?"":v).trim(); if(!v) return "";
  var m, y, mo, d;
  if(/^\d{5}(\.\d+)?$/.test(v)){ var n=parseFloat(v); if(n>20000&&n<80000){ var dt=new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000); return dt.getUTCFullYear()+"-"+p2(dt.getUTCMonth()+1)+"-"+p2(dt.getUTCDate()); } }
  if((m=/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(v))){ y=+m[1]; mo=+m[2]; d=+m[3]; }
  else if((m=/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/.exec(v))){ d=+m[1]; mo=+m[2]; y=+m[3]; if(y<100) y+=2000; }
  else if((m=/^(\d{1,2})[ \-]([A-Za-z]{3,9})\.?[ ,\-]+(\d{2,4})/.exec(v))){
   d=+m[1]; y=+m[3]; if(y<100) y+=2000;
   mo=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[2].slice(0,3).toLowerCase())+1;
  } else return "";
  if(!(mo>=1&&mo<=12&&d>=1&&d<=31&&y>=2000&&y<=2100)) return "";
  var chk=new Date(Date.UTC(y,mo-1,d)); if(chk.getUTCMonth()!==mo-1) return "";
  return y+"-"+p2(mo)+"-"+p2(d);
 }
 function parseAmount(v){
  var s=String(v==null?"":v).trim(); if(!s) return NaN;
  var neg=/^\(.*\)$/.test(s)||/^-/.test(s);
  s=s.replace(/rs\.?|inr|rupees?|\u20b9/gi,"").replace(/[^\d.]/g,"").replace(/^\.+|\.+$/g,""); if(!s) return NaN;
  var n=parseFloat(s); return isNaN(n)?NaN:(neg?-n:n);
 }
 var CATSYN={
  out:[[/fuel|diesel|petrol|ഡീസൽ|ഇന്ധനം/i,"Fuel"],[/bata|wage|salary|driver|കൂലി|ബത്ത/i,"Driver wages / bata"],[/toll|ടോൾ/i,"Toll"],[/parking|പാർക്കിംഗ്/i,"Parking"],
   [/service|repair|workshop|oil|maint|സർവീസ്|റിപ്പയർ/i,"Service / Repair"],[/tyre|tire|puncture|ടയർ/i,"Tyre"],[/insur|ഇൻഷുറൻസ്/i,"Insurance"],[/permit|tax|പെർമിറ്റ്/i,"Permit / Tax"],
   [/fitness|puc/i,"Fitness / PUC"],[/\bemi\b|loan/i,"EMI"],[/wash|കഴുകൽ/i,"Washing"],[/commission|കമ്മീഷൻ/i,"Commission paid"],[/mobile|recharge|internet/i,"Mobile / Internet"]],
  "in":[[/advance|അഡ്വാൻസ്/i,"Advance"],[/balance|ബാലൻസ്/i,"Trip balance"],[/tip|ടിപ്പ്/i,"Tip"],[/partner|margin|മാർജിൻ/i,"Partner margin"],[/trip|rent|hire|fare|payment|ട്രിപ്പ്/i,"Trip income"]]
 };
 /* the book's own category names (kept in step with tc-accbook.js; your own added categories are read from the settings) */
 var BASE={
  "in":["Trip income","Trip balance","Advance","Tip","Tip (driver)","Partner margin","Other income"],
  out:["Fuel","Driver wages / bata","Driver tip","Toll","Parking","Service / Repair","Tyre","Insurance","Permit / Tax","Fitness / PUC","EMI","Washing","Commission paid","Mobile / Internet","Other"]
 };
 var MODES=["Cash","UPI","Bank","Credit"];
 function catListOf(type){
  var base=(BASE[type]||[]).slice(), c=((db.settings||{}).accCats||{})[type];
  (Array.isArray(c)?c:[]).forEach(function(x){ if(base.indexOf(x)<0) base.push(x); });
  return base;
 }
 function vehiclesOf(){ return (Array.isArray(db.accVehicles)?db.accVehicles:[]).filter(function(v){ return !v.deleted; }); }
 function matchCat(txt,type){
  var a=A(), list=catListOf(type), t=String(txt||"").trim().toLowerCase(), i;
  if(t){
   for(i=0;i<list.length;i++){ if(list[i].toLowerCase()===t) return {cat:list[i],exact:true}; }
   for(i=0;i<list.length;i++){ if(a&&a.catLabel&&String(a.catLabel(list[i])).toLowerCase()===t) return {cat:list[i],exact:true}; }
   var sy=CATSYN[type]||[]; for(i=0;i<sy.length;i++){ if(sy[i][0].test(t)&&list.indexOf(sy[i][1])>=0) return {cat:sy[i][1],exact:false}; }
  }
  return {cat:type==="in"?"Other income":"Other",exact:false,fallback:true};
 }
 function typeWord(v){
  v=String(v||"").trim();
  if(/^(in|income|credit|cr|receipt|received|\+|വരവ്)/i.test(v)) return "in";
  if(/^(out|expense|debit|dr|paid|payment|spent|-|ചെലവ്)/i.test(v)) return "out";
  return "";
 }

 /* ------------------------------------------------------------ state */
 var S=null;
 function colOf(field){ for(var k in S.map){ if(S.map[k]===field) return +k; } return -1; }
 function cellOf(row,field){ var c=colOf(field); return c<0?"":String(row[c]==null?"":row[c]).trim(); }
 function existingKeys(){
  var a=A(), set={}; if(!a) return set;
  a.entries().forEach(function(e){ set[[e.date,e.type,Math.round((+e.amount||0)*100),e.cat,e.vehId||"",String(e.note||"").trim().toLowerCase()].join("|")]=1; });
  return set;
 }
 function build(){
  var a=A(), out=[], dup=0, skipped=[], keys=existingKeys(), inSum=0, outSum=0;
  var rows=S.rows.slice(S.hdr+1);
  rows.forEach(function(r,ix){
   var line=S.hdr+2+ix;
   var date=parseDate(cellOf(r,"date")); if(!date){ skipped.push(B("Row "+line+": date not understood","വരി "+line+": തീയതി മനസ്സിലായില്ല")); return; }
   var type="", amt=NaN;
   var inc=parseAmount(cellOf(r,"income")), exp=parseAmount(cellOf(r,"expense")), am=parseAmount(cellOf(r,"amount"));
   if(colOf("income")>=0||colOf("expense")>=0){
    if(inc>0){ type="in"; amt=inc; } else if(exp>0){ type="out"; amt=exp; }
   }
   if(!type&&!isNaN(am)&&am!==0){
    amt=Math.abs(am);
    type=typeWord(cellOf(r,"type"));
    if(!type) type=am<0?(S.defType==="in"?"out":"in"):S.defType;
   }
   if(!type||!(amt>0)){ skipped.push(B("Row "+line+": no amount","വരി "+line+": തുക ഇല്ല")); return; }
   var ct=cellOf(r,"cat"), mc=matchCat(ct,type), note=cellOf(r,"note");
   if(mc.fallback&&ct) note=(note?note+" · ":"")+ct;
   var veh=a.matchVehicle(cellOf(r,"vno"),cellOf(r,"vehicle")), vehId=veh?veh.id:(S.defVeh||"");
   var mode=cellOf(r,"mode"), md=""; MODES.forEach(function(m){ if(m.toLowerCase()===mode.toLowerCase()) md=m; });
   var lit=parseAmount(cellOf(r,"litres"));
   var e={date:date,type:type,amount:Math.round(amt*100)/100,cat:mc.cat,vehId:vehId,mode:md,note:note,litres:(mc.cat==="Fuel"&&lit>0)?lit:"",customer:cellOf(r,"customer"),route:cellOf(r,"route")};
   var key=[e.date,e.type,Math.round(e.amount*100),e.cat,e.vehId||"",String(e.note||"").trim().toLowerCase()].join("|");
   if(keys[key]){ dup++; return; }
   keys[key]=1;
   if(type==="in") inSum+=e.amount; else outSum+=e.amount;
   out.push(e);
  });
  return {entries:out,dup:dup,skipped:skipped,inSum:inSum,outSum:outSum};
 }

 /* ------------------------------------------------------------ screens */
 function S0(){ if(!db.settings) db.settings={}; return db.settings; }
 function lastBatch(){
  var b=S0().accLastImport; if(!b||!b.id) return null;
  var n=(db.accEntries||[]).filter(function(e){ return e.impBatch===b.id&&!e.deleted; }).length;
  return n?{id:b.id,n:n}:null;
 }
 function home(){
  var lb=lastBatch();
  modal('<h2>&#11014;&#65039; '+E(B("Import from Excel / CSV","Excel / CSV-ൽ നിന്ന് ഇറക്കുമതി"))+'</h2>'+
   '<p class="muted" style="font-size:13px">'+E(B("Choose your old sheet (.xlsx or .csv). You see a preview and can change every column before anything is saved.","പഴയ ഷീറ്റ് (.xlsx അല്ലെങ്കിൽ .csv) തിരഞ്ഞെടുക്കുക. സേവ് ചെയ്യുന്നതിന് മുമ്പ് പ്രിവ്യൂ കാണാം, ഓരോ കോളവും മാറ്റുകയും ചെയ്യാം."))+'</p>'+
   '<label>'+E(B("File","ഫയൽ"))+'<input id="tcImpFile" type="file" accept=".csv,.tsv,.txt,.xlsx,text/csv" onchange="tcImpPick(this)"></label>'+
   '<div id="tcImpErr" class="danger" style="font-size:13px"></div>'+
   (lb?'<div class="actions"><button class="danger" onclick="tcImpUndo()">'+E(B("Undo last import ("+lb.n+" entries)","അവസാന ഇറക്കുമതി റദ്ദാക്കുക ("+lb.n+" എൻട്രി)"))+'</button></div>':'')+
   '<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>');
 }
 window.tcImpOpen=function(){
  var a=A(); if(!a||!a.canWrite()){ say(B("Not available now","ഇപ്പോൾ ലഭ്യമല്ല")); return; }
  S=null; home();
 };
 function err(m){ var e=$("tcImpErr"); if(e) e.textContent=m; else say(m); }
 window.tcImpPick=async function(inp){
  var f=inp.files&&inp.files[0]; if(!f) return;
  try{
   var name=f.name.toLowerCase(), sheets;
   if(/\.xlsx$/.test(name)){
    if(typeof DecompressionStream==="undefined"){ err(B("This phone cannot open .xlsx here - save the sheet as CSV and choose that.","ഈ ഫോണിൽ .xlsx തുറക്കാൻ പറ്റില്ല - ഷീറ്റ് CSV ആയി സേവ് ചെയ്ത് അത് തിരഞ്ഞെടുക്കുക.")); return; }
    sheets=await readXlsx(await f.arrayBuffer());
   }else if(/\.xls$/.test(name)){ err(B("Old .xls files are not supported - save as .xlsx or CSV.","പഴയ .xls ഫയൽ പറ്റില്ല - .xlsx അല്ലെങ്കിൽ CSV ആയി സേവ് ചെയ്യുക.")); return; }
   else sheets=[{name:"CSV",rows:parseCsv(await f.text())}];
   sheets=sheets.filter(function(s){ return s.rows.length>=2; });
   if(!sheets.length){ err(B("No rows found in this file.","ഈ ഫയലിൽ വരികൾ ഒന്നും കണ്ടില്ല.")); return; }
   S={file:f.name,sheets:sheets,sheet:0,defType:"out",defVeh:""};
   useSheet(bestSheet(sheets));
  }catch(e){ err(B("Could not read this file: ","ഈ ഫയൽ വായിക്കാൻ പറ്റിയില്ല: ")+(e&&e.message||e)); }
 };
 /* the sheet whose top rows look most like a header (this app's own Excel has a Summary sheet first and the entries in "All entries") */
 function bestSheet(sheets){
  var best=0, bn=-1;
  sheets.forEach(function(sh,i){
   var m=0; for(var r=0;r<Math.min(15,sh.rows.length);r++){ var seen={},n=0; sh.rows[r].forEach(function(c){ var f=guessField(c); if(f&&!seen[f]){ seen[f]=1; n++; } }); if(n>m) m=n; }
   if(m>bn){ bn=m; best=i; }
  });
  return best;
 }
 function useSheet(i){
  S.sheet=i; S.rows=S.sheets[i].rows;
  S.hdr=findHeader(S.rows);
  S.map=guessMap(S.rows[S.hdr]);
  review();
 }
 function review(){
  var a=A(), r=build(), hdr=S.rows[S.hdr], vs=vehiclesOf();
  var h='<h2>&#11014;&#65039; '+E(B("Import","ഇറക്കുമതി"))+'</h2><div class="muted" style="font-size:12.5px">'+E(S.file)+(S.sheets.length>1?' &middot; ':'')+'</div>';
  if(S.sheets.length>1){
   h+='<label>'+E(B("Sheet","ഷീറ്റ്"))+'<select id="tcImpSheet" onchange="tcImpSheet(this.value)">'+S.sheets.map(function(s,i){ return '<option value="'+i+'"'+(i===S.sheet?' selected':'')+'>'+E(s.name)+' ('+(s.rows.length-1)+')</option>'; }).join("")+'</select></label>';
  }
  h+='<h3 style="font-size:14px;margin:10px 0 4px">'+E(B("1. What is each column?","1. ഓരോ കോളവും എന്താണ്?"))+'</h3>';
  hdr.forEach(function(c,ix){
   if(String(c).trim()==="") return;
   var sample=""; for(var k=S.hdr+1;k<S.rows.length&&!sample;k++){ sample=String(S.rows[k][ix]==null?"":S.rows[k][ix]).trim(); }
   h+='<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><div style="flex:1;min-width:0;font-size:12.5px"><b>'+E(c)+'</b><br><span class="muted">'+E(sample.slice(0,24))+'</span></div>'+
    '<select data-col="'+ix+'" style="flex:1" onchange="tcImpMap(this)">'+FIELDS.map(function(f){ return '<option value="'+f[0]+'"'+((S.map[ix]||"")===f[0]?' selected':'')+'>'+E(B(f[1],f[2]))+'</option>'; }).join("")+'</select></div>';
  });
  h+='<h3 style="font-size:14px;margin:10px 0 4px">'+E(B("2. When a row has no Income / Expense word","2. വരവ്/ചെലവ് എന്ന് പറയാത്ത വരി"))+'</h3>'+
   '<div class="grid"><label>'+E(B("Treat as","ഇങ്ങനെ കണക്കാക്കുക"))+'<select id="tcImpDef" onchange="tcImpDef(this.value)"><option value="out"'+(S.defType==="out"?' selected':'')+'>'+E(B("Expense","ചെലവ്"))+'</option><option value="in"'+(S.defType==="in"?' selected':'')+'>'+E(B("Income","വരവ്"))+'</option></select></label>'+
   '<label>'+E(B("Vehicle for rows with none","വാഹനം ഇല്ലാത്ത വരികൾക്ക്"))+'<select id="tcImpVeh" onchange="tcImpVeh(this.value)"><option value="">'+E(B("- none -","- ഇല്ല -"))+'</option>'+vs.map(function(v){ return '<option value="'+v.id+'"'+(S.defVeh===v.id?' selected':'')+'>'+E(v.name+(v.no?" ("+v.no+")":""))+'</option>'; }).join("")+'</select></label></div>';
  h+='<h3 style="font-size:14px;margin:10px 0 4px">'+E(B("3. Preview","3. പ്രിവ്യൂ"))+'</h3><div class="ratebox" style="font-size:13px">';
  if(colOf("date")<0) h+='<div class="danger">'+E(B("Choose which column is the Date.","ഏത് കോളമാണ് തീയതി എന്ന് തിരഞ്ഞെടുക്കുക."))+'</div>';
  if(colOf("amount")<0&&colOf("income")<0&&colOf("expense")<0) h+='<div class="danger">'+E(B("Choose the Amount column (or Income / Expense columns).","തുകയുടെ കോളം (അല്ലെങ്കിൽ വരവ് / ചെലവ് കോളങ്ങൾ) തിരഞ്ഞെടുക്കുക."))+'</div>';
  h+='<div><b>'+r.entries.length+'</b> '+E(B("rows ready","വരികൾ തയ്യാർ"))+(r.dup?' &middot; '+r.dup+' '+E(B("already in the book (skipped)","ബുക്കിൽ ഉണ്ട് (ഒഴിവാക്കി)")):'')+(r.skipped.length?' &middot; '+r.skipped.length+' '+E(B("cannot be read (skipped)","വായിക്കാൻ പറ്റിയില്ല (ഒഴിവാക്കി)")):'')+'</div>'+
   '<div>'+E(B("Income","വരവ്"))+' <b style="color:#1c6b2c">'+mny(r.inSum)+'</b> &middot; '+E(B("Expense","ചെലവ്"))+' <b style="color:#a12d2d">'+mny(r.outSum)+'</b></div>';
  r.entries.slice(0,4).forEach(function(e){
   var v=a.vById(e.vehId);
   h+='<div style="font-size:12px;border-top:1px solid #e1e6ea;margin-top:3px;padding-top:3px">'+E(e.date+" · "+(e.type==="in"?"+":"-")+mny(e.amount)+" · "+a.catLabel(e.cat)+(v?" · "+v.name:"")+(e.note?" · "+String(e.note).slice(0,30):""))+'</div>';
  });
  if(r.skipped.length) h+='<div class="muted" style="font-size:11.5px;margin-top:4px">'+E(r.skipped.slice(0,3).join("; "))+'</div>';
  h+='</div><div id="tcImpErr" class="danger" style="font-size:13px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcImpGo()"'+(r.entries.length?'':' disabled')+'>'+E(B("Import "+r.entries.length+" entries","ഇറക്കുമതി ചെയ്യുക ("+r.entries.length+")"))+'</button><button onclick="tcImpOpen()">'+E(B("Back","പിന്നോട്ട്"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>';
  modal(h);
 }
 window.tcImpMap=function(sel){
  var ix=+sel.getAttribute("data-col"), v=sel.value;
  if(v){ for(var k in S.map){ if(S.map[k]===v&&+k!==ix) delete S.map[k]; } S.map[ix]=v; } else delete S.map[ix];
  review();
 };
 window.tcImpDef=function(v){ S.defType=v==="in"?"in":"out"; review(); };
 window.tcImpVeh=function(v){ S.defVeh=v; review(); };
 window.tcImpSheet=function(i){ useSheet(+i); };
 window.tcImpGo=function(){
  var a=A(); if(!S||!a||!a.canWrite()) return;
  if(colOf("date")<0){ err(B("Choose which column is the Date.","ഏത് കോളമാണ് തീയതി എന്ന് തിരഞ്ഞെടുക്കുക.")); return; }
  var r=build(); if(!r.entries.length) return;
  var id; try{ id=crypto.randomUUID(); }catch(e){ id="imp"+Date.now(); }
  if(!Array.isArray(db.accEntries)) db.accEntries=[];
  r.entries.forEach(function(e){
   var uid; try{ uid=crypto.randomUUID(); }catch(x){ uid="ie"+Date.now()+Math.random().toString(16).slice(2); }
   e.id=uid; e.src="manual"; e.imp=1; e.impBatch=id; e.created=new Date().toISOString();
   if(!S0().accStart) S0().accStart=new Date().toISOString();
   db.accEntries.push(e);
  });
  S0().accLastImport={id:id,n:r.entries.length,at:new Date().toISOString()};
  try{ save(); }catch(e){}
  closeModal(); say(B(r.entries.length+" entries imported","എൻട്രികൾ ഇറക്കുമതി ചെയ്തു: "+r.entries.length));
  try{ tcAbRefresh(); }catch(e){}
 };
 window.tcImpUndo=function(){
  var lb=lastBatch(); if(!lb) return;
  if(!confirm(B("Remove the "+lb.n+" entries of the last import?","അവസാന ഇറക്കുമതിയിലെ "+lb.n+" എൻട്രികൾ നീക്കട്ടേ?"))) return;
  (db.accEntries||[]).forEach(function(e){ if(e.impBatch===lb.id&&!e.deleted){ e.deleted=true; e.edited=true; } });
  delete S0().accLastImport;
  try{ save(); }catch(e){}
  closeModal(); say(B("Removed","നീക്കി")); try{ tcAbRefresh(); }catch(e){}
 };
 window.__tcImportApi={parseCsv:parseCsv,parseDate:parseDate,parseAmount:parseAmount,readXlsx:readXlsx};

 /* ------------------------------------------------------------ the button */
 function addButton(){
  var csv=document.querySelector('#app button[onclick="tcAbCsv()"]');
  if(!csv||document.getElementById("tcImpBtn")) return;
  var b=document.createElement("button"); b.id="tcImpBtn"; b.setAttribute("onclick","tcImpOpen()");
  b.innerHTML="&#11014;&#65039; "+E(B("Import","ഇറക്കുമതി"));
  csv.parentNode.insertBefore(b,csv);
 }
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ addButton(); }catch(e){} },100); }
 function start(){
  var app=$("app");
  if(window.MutationObserver&&app) new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
