/* Readable Excel export (tc-xlsx.js, loaded by tc-regdocs.js).
   Button "Excel" in Trip & Accounts -> a real .xlsx file with THREE sheets, built on the phone itself:
   no server, no outside library, no internet needed, nothing to pay (a small zip + XML writer is inside this file).
     1) Summary   - business, vehicle, period; income, expense, profit, trips; expense and income by category with %.
     2) Trips     - ONE ROW PER TRIP, coloured bands: TRIP DETAILS | INCOME | EXPENSES | RESULT | PAYMENT | INFO.
                    Dates dd-mm-yyyy, full text in every cell (long routes are not wrapped - tap the cell to read all),
                    freeze panes at column D, totals row (SUM formulas), then the entries that belong to no trip.
     3) All entries - one line per entry with a filter; no repeated long route.
   Same period + vehicle as chosen on the Accounts page. Headers are Malayalam + English. Money is shown as Rs. without decimals
   (the cell keeps the exact value). Driver tips given to the driver are shown as information and are NOT in income / profit.
   Reads the book through window.__tcAbApi and the trip report through window.__tcTrApi; stores nothing. */
(function(){
 if(window.__tcXlsx) return;
 window.__tcXlsx=1;
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var BI=function(en,ml){ return en+"\n"+ml; };      /* header cell: English + Malayalam on two lines */
 var say=function(m){ try{ toast(m); }catch(e){} };

 /* =========================== zip (stored, no compression) =========================== */
 var CT=null;
 function crc32(u8){
  if(!CT){ CT=new Uint32Array(256); for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); CT[n]=c>>>0; } }
  var crc=0xFFFFFFFF; for(var i=0;i<u8.length;i++) crc=CT[(crc^u8[i])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
 }
 function zip(files){
  var enc=new TextEncoder(), parts=[], cen=[], off=0, now=new Date();
  var tm=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1), dt=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  files.forEach(function(f){
   var nm=enc.encode(f.name), data=f.data, crc=crc32(data), sz=data.length;
   var lh=new Uint8Array(30+nm.length), v=new DataView(lh.buffer);
   v.setUint32(0,0x04034b50,true); v.setUint16(4,20,true); v.setUint16(6,0x0800,true); v.setUint16(8,0,true); v.setUint16(10,tm,true); v.setUint16(12,dt,true);
   v.setUint32(14,crc,true); v.setUint32(18,sz,true); v.setUint32(22,sz,true); v.setUint16(26,nm.length,true); v.setUint16(28,0,true); lh.set(nm,30);
   parts.push(lh,data);
   var ch=new Uint8Array(46+nm.length), c=new DataView(ch.buffer);
   c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true); c.setUint16(12,tm,true); c.setUint16(14,dt,true);
   c.setUint32(16,crc,true); c.setUint32(20,sz,true); c.setUint32(24,sz,true); c.setUint16(28,nm.length,true); c.setUint16(30,0,true); c.setUint16(32,0,true);
   c.setUint16(34,0,true); c.setUint16(36,0,true); c.setUint32(38,0,true); c.setUint32(42,off,true); ch.set(nm,46);
   cen.push(ch); off+=lh.length+sz;
  });
  var cdSize=0; cen.forEach(function(x){ cdSize+=x.length; });
  var end=new Uint8Array(22), e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true); e.setUint16(4,0,true); e.setUint16(6,0,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,cdSize,true); e.setUint32(16,off,true); e.setUint16(20,0,true);
  var all=parts.concat(cen,[end]), total=0; all.forEach(function(x){ total+=x.length; });
  var out=new Uint8Array(total), p=0; all.forEach(function(x){ out.set(x,p); p+=x.length; });
  return out;
 }

 /* =========================== xlsx writer =========================== */
 function X(s){ return String(s==null?"":s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
 function XA(s){ return X(s).replace(/"/g,"&quot;"); }
 function colName(n){ var s=""; while(n>0){ var m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
 function Styles(){
  var fonts=['<font><sz val="11"/><name val="Calibri"/></font>'], fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'];
  var borders=['<border><left/><right/><top/><bottom/><diagonal/></border>','<border><left style="thin"><color rgb="FFCFD8DE"/></left><right style="thin"><color rgb="FFCFD8DE"/></right><top style="thin"><color rgb="FFCFD8DE"/></top><bottom style="thin"><color rgb="FFCFD8DE"/></bottom><diagonal/></border>'];
  var fmts=[], xfs=['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], cache={};
  function idx(list,xml){ var i=list.indexOf(xml); if(i<0){ list.push(xml); i=list.length-1; } return i; }
  this.get=function(o){
   o=o||{}; var key=JSON.stringify(o); if(cache[key]!==undefined) return cache[key];
   var f='<font>'+(o.b?'<b/>':'')+(o.i?'<i/>':'')+'<sz val="'+(o.sz||11)+'"/>'+(o.color?'<color rgb="FF'+o.color+'"/>':'')+'<name val="Calibri"/></font>';
   var fi=idx(fonts,f);
   var fl=o.bg?idx(fills,'<fill><patternFill patternType="solid"><fgColor rgb="FF'+o.bg+'"/><bgColor indexed="64"/></patternFill></fill>'):0;
   var bo=o.border?1:0, nf=0;
   if(o.fmt==="pct") nf=9;
   else if(o.fmt){ var fx='<numFmt numFmtId="@@" formatCode="'+XA(o.fmt)+'"/>'; var k=fmts.indexOf(o.fmt); if(k<0){ fmts.push(o.fmt); k=fmts.length-1; } nf=164+k; }
   var al=(o.al||o.wrap||o.va)?'<alignment'+(o.al?' horizontal="'+o.al+'"':'')+' vertical="'+(o.va||"center")+'"'+(o.wrap?' wrapText="1"':'')+'/>':'';
   var xf='<xf numFmtId="'+nf+'" fontId="'+fi+'" fillId="'+fl+'" borderId="'+bo+'" xfId="0"'+(nf?' applyNumberFormat="1"':'')+(fi?' applyFont="1"':'')+(fl?' applyFill="1"':'')+(bo?' applyBorder="1"':'')+(al?' applyAlignment="1">'+al+'</xf>':'/>');
   xfs.push(xf); cache[key]=xfs.length-1; return cache[key];
  };
  this.xml=function(){
   return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    (fmts.length?'<numFmts count="'+fmts.length+'">'+fmts.map(function(f,i){ return '<numFmt numFmtId="'+(164+i)+'" formatCode="'+XA(f)+'"/>'; }).join("")+'</numFmts>':'')+
    '<fonts count="'+fonts.length+'">'+fonts.join("")+'</fonts><fills count="'+fills.length+'">'+fills.join("")+'</fills><borders count="'+borders.length+'">'+borders.join("")+'</borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="'+xfs.length+'">'+xfs.join("")+'</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  };
 }
 /* sheet = {name, rows:[[cell|null,...]], widths:[...], merges:["A1:B1"], freeze:"D5", filter:"A3:I9", heights:{rowNo:pt}}  cell = {v,f,s} */
 function sheetXml(sh,S){
  var rows=sh.rows, maxC=0; rows.forEach(function(r){ if(r.length>maxC) maxC=r.length; });
  var x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:'+colName(Math.max(1,maxC))+Math.max(1,rows.length)+'"/>';
  x+='<sheetViews><sheetView workbookViewId="0"'+(sh.first?' tabSelected="1"':'')+'>';
  if(sh.freeze){
   var m=/^([A-Z]+)(\d+)$/.exec(sh.freeze), cc=0; for(var i=0;i<m[1].length;i++) cc=cc*26+(m[1].charCodeAt(i)-64);
   var xs=cc-1, ys=(+m[2])-1, act=xs&&ys?"bottomRight":(xs?"topRight":"bottomLeft");
   x+='<pane'+(xs?' xSplit="'+xs+'"':'')+(ys?' ySplit="'+ys+'"':'')+' topLeftCell="'+sh.freeze+'" activePane="'+act+'" state="frozen"/><selection pane="'+act+'"/>';
  }
  x+='</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>';
  if(sh.widths&&sh.widths.length) x+='<cols>'+sh.widths.map(function(w,i){ return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>'; }).join("")+'</cols>';
  x+='<sheetData>';
  rows.forEach(function(r,ri){
   var h=sh.heights&&sh.heights[ri+1];
   x+='<row r="'+(ri+1)+'"'+(h?' ht="'+h+'" customHeight="1"':'')+'>';
   r.forEach(function(c,ci){
    if(c==null) return;
    var ref=colName(ci+1)+(ri+1), s=c.s?S.get(c.s):0, sa=s?' s="'+s+'"':'';
    if(c.f!==undefined) x+='<c r="'+ref+'"'+sa+'><f>'+X(c.f)+'</f>'+(typeof c.v==="number"&&isFinite(c.v)?'<v>'+c.v+'</v>':'')+'</c>';
    else if(typeof c.v==="number"&&isFinite(c.v)) x+='<c r="'+ref+'"'+sa+'><v>'+c.v+'</v></c>';
    else if(c.v===""||c.v==null) x+='<c r="'+ref+'"'+sa+'/>';
    else x+='<c r="'+ref+'"'+sa+' t="inlineStr"><is><t xml:space="preserve">'+X(c.v)+'</t></is></c>';
   });
   x+='</row>';
  });
  x+='</sheetData>';
  if(sh.filter) x+='<autoFilter ref="'+sh.filter+'"/>';
  if(sh.merges&&sh.merges.length) x+='<mergeCells count="'+sh.merges.length+'">'+sh.merges.map(function(m){ return '<mergeCell ref="'+m+'"/>'; }).join("")+'</mergeCells>';
  x+='<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToHeight="0"/></worksheet>';
  return x;
 }
 function workbook(sheets){
  var S=new Styles(), enc=new TextEncoder(), files=[];
  var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
   sheets.map(function(s,i){ return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("")+'</Types>';
  files.push({name:"[Content_Types].xml",data:enc.encode(ct)});
  files.push({name:"_rels/.rels",data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')});
  files.push({name:"xl/workbook.xml",data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>'+
   sheets.map(function(s,i){ return '<sheet name="'+XA(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'; }).join("")+'</sheets></workbook>')});
  files.push({name:"xl/_rels/workbook.xml.rels",data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   sheets.map(function(s,i){ return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'; }).join("")+
   '<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')});
  var sx=sheets.map(function(s,i){ s.first=(i===0); return sheetXml(s,S); });   /* styles are registered while the sheets are written */
  files.push({name:"xl/styles.xml",data:enc.encode(S.xml())});
  sx.forEach(function(x,i){ files.push({name:"xl/worksheets/sheet"+(i+1)+".xml",data:enc.encode(x)}); });
  return zip(files);
 }
 window.__tcXlsxWorkbook=workbook;   /* (also used by tests) */

 /* =========================== the report =========================== */
 var INK="1F2D5A", GRN="1E7B34", RED="B42318", PUR="5B3A8C", GREY="666666", TOT="EEF1F8";
 var MONEY="₹#,##0;[Red]-₹#,##0";
 var mon=function(n,o){ return {v:Math.round((+n||0)*100)/100,s:Object.assign({fmt:MONEY,border:1},o||{})}; };
 var txt=function(v,o){ return {v:v==null?"":v,s:Object.assign({border:1},o||{})}; };
 function dmy(iso){ var s=String(iso||"").slice(0,10); try{ return tcFormatDate(s); }catch(e){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m?m[3]+"-"+m[2]+"-"+m[1]:s; } }
 function tm(t){ try{ return t?tcFormatTime(t):""; }catch(e){ return t||""; } }
 function A(){ return window.__tcAbApi; }

 function periodInfo(a,list){
  var lab={month:B("This month","ഈ മാസം"),last:B("Last month","കഴിഞ്ഞ മാസം"),year:B("This year","ഈ വർഷം"),all:B("All time","എല്ലാ കാലവും")}[a.ST.period]||a.ST.period;
  var ds=list.map(function(e){ return e.date; }).sort();
  return {label:lab,from:ds[0]||"",to:ds[ds.length-1]||""};
 }
 function vehInfo(a){
  var v=a.ST.veh;
  if(v==="all") return B("All vehicles","എല്ലാ വാഹനങ്ങളും");
  if(v==="none") return B("Entries with no vehicle chosen","വാഹനം തിരഞ്ഞെടുക്കാത്ത എൻട്രികൾ");
  var x=a.vById(v); return x?(x.name||"")+(x.no?" ("+x.no+")":""):"";
 }
 function title(txtv){ return [{v:txtv,s:{b:1,sz:14,color:INK}}]; }

 function summarySheet(a,list,trips){
  var P=periodInfo(a,list), biz=(db.business&&db.business.name)||"Travel Connect";
  var inc=0,out=0,drv=0, oc={}, ic={};
  list.forEach(function(e){
   var x=+e.amount||0;
   if(a.isDrv(e)){ drv+=x; return; }
   if(e.type==="in"){ inc+=x; ic[e.cat]=(ic[e.cat]||0)+x; } else { out+=x; oc[e.cat]=(oc[e.cat]||0)+x; }
  });
  var net=inc-out, rows=[];
  rows.push(title(biz+" — "+P.label));
  rows.push([{v:vehInfo(a)+(P.from?" · "+dmy(P.from)+" – "+dmy(P.to):""),s:{sz:9,color:GREY}}]);
  rows.push([]);
  var lab=function(en,ml,c){ return {v:en+" ("+ml+")",s:{b:1,color:c||"000000"}}; };
  rows.push([lab("Total income","ആകെ വരവ്"),{v:Math.round(inc*100)/100,s:{b:1,sz:12,color:GRN,fmt:MONEY}}]);
  rows.push([lab("Total expense","ആകെ ചിലവ്"),{v:Math.round(out*100)/100,s:{b:1,sz:12,color:RED,fmt:MONEY}}]);
  rows.push([lab("Profit","ലാഭം"),{v:Math.round(net*100)/100,s:{b:1,sz:12,color:net>=0?GRN:RED,fmt:MONEY}}]);
  rows.push([lab("Trips","ട്രിപ്പുകൾ"),{v:trips.length,s:{b:1,sz:12}}]);
  if(drv>0) rows.push([{v:"Driver tips (information, not in profit) / ഡ്രൈവർ ടിപ്പ്",s:{color:GREY}},{v:Math.round(drv*100)/100,s:{color:GREY,fmt:MONEY}}]);
  rows.push([]);
  function table(titleTxt,map,total){
   rows.push([{v:titleTxt,s:{b:1,color:INK,sz:12}}]);
   rows.push([{v:"Category / വിഭാഗം",s:{b:1,color:"FFFFFF",bg:INK,border:1}},{v:"Amount / തുക",s:{b:1,color:"FFFFFF",bg:INK,border:1,al:"center"}},{v:"%",s:{b:1,color:"FFFFFF",bg:INK,border:1,al:"center"}}]);
   Object.keys(map).sort(function(p,q){ return map[q]-map[p]; }).forEach(function(k){
    rows.push([txt(a.catLabel(k)),mon(map[k]),{v:total>0?map[k]/total:0,s:{fmt:"pct",border:1}}]);
   });
   if(!Object.keys(map).length) rows.push([txt("-")]);
   rows.push([]);
  }
  table("Expense by category / ചിലവ് വിഭാഗം തിരിച്ച്",oc,out);
  table("Income by category / വരവ് വിഭാഗം തിരിച്ച്",ic,inc);
  var noteRow=rows.length+1;
  rows.push([{v:"Money is counted on the day it was received. The Trips sheet lists trips by trip date with their full figures. For personal record keeping only - not GST/tax filing. / പണം കിട്ടിയ ദിവസമാണ് കണക്കാക്കുന്നത്. വ്യക്തിഗത രേഖയ്ക്ക് മാത്രം - GST/നികുതി ഫയലിങ്ങിനല്ല.",s:{sz:9,color:GREY,wrap:1,va:"top"}}]);
  var hh={}; hh[noteRow]=52;
  return {name:"Summary - സംഗ്രഹം",rows:rows,widths:[54,16,10],merges:["A"+noteRow+":C"+noteRow],heights:hh};
 }

 var BASE_OUT=["Fuel","Driver wages / bata","Toll","Parking","Other"];
 function tripsSheet(a,list,trips){
  /* expense columns: Fuel, Driver wages / bata, Toll/Parking, every other used category, Other */
  var extra=[], seen={};
  trips.forEach(function(x){ x.es.forEach(function(e){ if(e.type==="out"&&!a.isDrv(e)&&BASE_OUT.indexOf(e.cat)<0&&!seen[e.cat]){ seen[e.cat]=1; extra.push(e.cat); } }); });
  var hdr=function(t,bg){ return {v:t,s:{b:1,color:"FFFFFF",bg:bg||INK,border:1,al:"center",wrap:1}}; };
  var cols=[]; /* [header, width, band] */
  var det=[["Date\nതീയതി",11],["Pickup time\nസമയം",11],["Customer\nകസ്റ്റമർ",20],["Mobile\nമൊബൈൽ",12],["Pickup point\nപിക്കപ്പ് സ്ഥലം",20],["Destinations\nസ്ഥലങ്ങൾ",30],["Drop point\nഡ്രോപ്പ്",18],["Days\nദിവസം",8],["Vehicle\nവാഹനം",16],["Full route\nമുഴുവൻ റൂട്ട്",40]];
  var inc=[["Bill amount\nബിൽ തുക",12],["Advance\nഅഡ്വാൻസ്",11],["After trip\nട്രിപ്പിന് ശേഷം",11],["Received on\nകിട്ടിയ തീയതി",26],["Vehicle tip\nടിപ്പ്",10],["Discount given\nഡിസ്കൗണ്ട്",10],["Total income\nആകെ വരവ്",12]];
  var exp=[["Fuel\nഇന്ധനം",10],["Driver wages / bata\nഡ്രൈവർ",12],["Toll / Parking\nടോൾ/പാർക്കിംഗ്",12]].concat(extra.map(function(c){ return [a.catLabel(c),12]; })).concat([["Other\nമറ്റുള്ളവ",10]]);
  var res=[["Total expense\nആകെ ചിലവ്",12],["Profit\nലാഭം",12]];
  var pay=[["Paid by\nCash/UPI/Bank",14],["Pending\nകിട്ടാനുള്ളത്",11],["Status\nസ്ഥിതി",28]];
  var info=[["Driver tip via me\nഡ്രൈവർ ടിപ്പ് (എന്റെ വഴി)",13],["Driver tip direct\nടിപ്പ് നേരിട്ട്",13]];
  var groups=[["TRIP DETAILS / ട്രിപ്പ് വിവരങ്ങൾ",det,INK],["INCOME / വരവ്",inc,GRN],["EXPENSES / ചിലവ്",exp,RED],["RESULT / ഫലം",res,PUR],["PAYMENT / പേയ്മെന്റ്",pay,INK],["INFO (not in profit) / അറിയാൻ",info,"7A7F87"]];
  var band=[], head=[], widths=[], merges=[], c0=1, starts={};
  groups.forEach(function(g,gi){
   starts[gi]=c0;
   g[1].forEach(function(c,i){ band.push(i===0?hdr(g[0],g[2]):hdr("",g[2])); head.push(hdr(c[0],g[2])); widths.push(c[1]); });
   if(g[1].length>1) merges.push(colName(c0)+"3:"+colName(c0+g[1].length-1)+"3");
   c0+=g[1].length;
  });
  var nCols=head.length;
  var rows=[title(B("Trip by trip","ട്രിപ്പ് തിരിച്ചുള്ള കണക്ക്")),
   [{v:B("Tap a route cell to read the whole route. The date and customer stay in view when you scroll sideways.","റൂട്ട് സെല്ലിൽ തൊട്ടാൽ മുഴുവൻ റൂട്ടും കാണാം. വശത്തേക്ക് സ്ക്രോൾ ചെയ്യുമ്പോൾ തീയതിയും കസ്റ്റമറും നിൽക്കും."),s:{sz:9,color:GREY}}],
   band,head];
  var first=rows.length+1;
  var iIncome=det.length, iBill=iIncome, iExp=det.length+inc.length, iRes=iExp+exp.length, iPay=iRes+res.length, iInfo=iPay+pay.length;
  trips.forEach(function(x){
   var q=x.q, t=x.t, ds=(window.__tcTrApi.dests(q)||[]), start=t.pickup||q.pickup||"", drop=q.returnPoint||"";
   var full=[start].concat(ds).concat(drop&&(!ds.length||ds[ds.length-1]!==drop)?[drop]:[]).filter(Boolean).join(" → ");
   var v=a.vById(x.vehId), veh=v?(v.name||"")+(v.no?" "+v.no:""):[q.vehicle,q.vehicleNo].filter(Boolean).join(" ");
   var adv=0,after=0,tip=0, recv=[], oc={};
   x.es.slice().sort(function(p,r){ return p.date<r.date?-1:p.date>r.date?1:0; }).forEach(function(e){
    var m=+e.amount||0;
    if(a.isDrv(e)) return;
    if(e.type==="in"){
     if(e.cat==="Advance") adv+=m; else if(e.cat==="Tip") tip+=m; else after+=m;
     recv.push(dmy(e.date)+" ₹"+Math.round(m*100)/100+(e.mode?" "+e.mode:""));
    }else oc[e.cat]=(oc[e.cat]||0)+m;
   });
   var other=0; Object.keys(oc).forEach(function(k){ if(BASE_OUT.indexOf(k)<0&&extra.indexOf(k)<0) other+=oc[k]; });
   other+=(oc["Other"]||0);
   var modes=[]; x.es.forEach(function(e){ if(e.type==="in"&&!a.isDrv(e)&&e.mode&&modes.indexOf(e.mode)<0) modes.push(e.mode); });
   var status;
   if(!x.billed&&x.bal<=0&&x.paid<=0) status=txt("No bill yet · ബിൽ ആയിട്ടില്ല",{color:GREY});
   else if(x.bal>0) status=txt("🔴 Pending ₹"+Math.round(x.bal)+" · ബാക്കി",{b:1,color:RED});
   else if(x.disc>0) status=txt("✅ Settled (discount ₹"+Math.round(x.disc)+") · തീർന്നു",{b:1,color:GRN});
   else status=txt("✅ Fully received · മുഴുവൻ കിട്ടി",{b:1,color:GRN});
   var r=[txt(dmy(x.date)),txt(tm(t.startTime||q.startTime)),txt(t.customer||q.customer||""),txt(q.mobile||""),txt(start),txt(ds.join(", ")),txt(drop),{v:+(t.days||q.days||1),s:{border:1,al:"center"}},txt(veh),txt(full),
    mon(x.bill),mon(adv),mon(after),txt(recv.join(" · ")),mon(tip),mon(x.disc),mon(x.inc,{b:1}),
    mon(oc["Fuel"]||0),mon(oc["Driver wages / bata"]||0),mon((oc["Toll"]||0)+(oc["Parking"]||0))];
   extra.forEach(function(c){ r.push(mon(oc[c]||0)); });
   r.push(mon(other));
   r.push(mon(x.out,{b:1}),mon(x.profit,{b:1,bg:x.profit>=0?"E6F4EA":"FDECEA",color:x.profit>=0?GRN:RED}));
   r.push(txt(modes.join(", ")),mon(x.bal,x.bal>0?{color:RED,b:1}:{}),status);
   r.push(mon(x.drvVia),mon(x.drvDirect));
   rows.push(r);
  });
  var last=rows.length;
  /* totals row (SUM formulas, with the numbers also stored) */
  var numCols=[]; for(var c=iBill;c<nCols;c++){ if(c===iBill+3||c===iPay||c===iPay+2) continue; numCols.push(c); }
  var tr=new Array(nCols).fill(null); tr[2]={v:"TOTAL · ആകെ",s:{b:1}};
  numCols.forEach(function(c){
   var sum=0; for(var i=first-1;i<last;i++){ var cell=rows[i][c]; if(cell&&typeof cell.v==="number") sum+=cell.v; }
   tr[c]=trips.length?{f:"SUM("+colName(c+1)+first+":"+colName(c+1)+last+")",v:Math.round(sum*100)/100,s:{b:1,bg:TOT,border:1,fmt:MONEY}}:{v:0,s:{b:1,bg:TOT,border:1,fmt:MONEY}};
  });
  rows.push(tr);
  var totRow=rows.length;
  /* entries that belong to no trip of this sheet */
  var inTrip={}; trips.forEach(function(x){ inTrip[x.t.id]=1; });
  var loose=list.filter(function(e){ return !a.isDrv(e)&&!(e.tripId&&inTrip[e.tripId]); }).slice().sort(function(p,q2){ return p.date<q2.date?-1:p.date>q2.date?1:0; });
  rows.push([]);
  rows.push([{v:"Entries not linked to a trip of this list / ഈ ലിസ്റ്റിലെ ട്രിപ്പുമായി ബന്ധമില്ലാത്ത എൻട്രികൾ",s:{b:1,color:INK,sz:12}}]);
  var lh=new Array(nCols).fill(null);
  lh[0]=hdr("Date\nതീയതി"); lh[2]=hdr("Customer\nകസ്റ്റമർ"); lh[4]=hdr("Category\nവിഭാഗം"); lh[5]=hdr("Note\nകുറിപ്പ്");
  lh[iBill+6]=hdr("Income\nവരവ്",GRN); lh[iRes]=hdr("Expense\nചിലവ്",RED); lh[iPay]=hdr("Paid by\nപേയ്മെന്റ്");
  rows.push(lh);
  var lf=rows.length+1;
  loose.forEach(function(e){
   var r=new Array(nCols).fill(null), m=+e.amount||0, v=a.vById(e.vehId);
   r[0]=txt(dmy(e.date)); r[2]=txt(e.customer||""); r[4]=txt(a.catLabel(e.cat)); r[5]=txt([e.note,e.route].filter(Boolean).join(" · "));
   if(e.type==="in") r[iBill+6]=mon(m); else r[iRes]=mon(m);
   r[iPay]=txt(e.mode||"");
   rows.push(r);
  });
  if(!loose.length){ var r0=new Array(nCols).fill(null); r0[0]=txt("-"); rows.push(r0); }
  var ll=rows.length;
  var sr=new Array(nCols).fill(null); sr[2]={v:"TOTAL · ആകെ",s:{b:1}};
  var si=0,so=0; loose.forEach(function(e){ if(e.type==="in") si+=+e.amount||0; else so+=+e.amount||0; });
  sr[iBill+6]={f:"SUM("+colName(iBill+7)+lf+":"+colName(iBill+7)+ll+")",v:Math.round(si*100)/100,s:{b:1,bg:TOT,border:1,fmt:MONEY}};
  sr[iRes]={f:"SUM("+colName(iRes+1)+lf+":"+colName(iRes+1)+ll+")",v:Math.round(so*100)/100,s:{b:1,bg:TOT,border:1,fmt:MONEY}};
  rows.push(sr);
  return {name:"Trips - ട്രിപ്പ്",rows:rows,widths:widths,merges:merges,freeze:"D5",heights:{3:20,4:42}};
 }

 function entriesSheet(a,list){
  var hdr=function(t){ return {v:t,s:{b:1,color:"FFFFFF",bg:INK,border:1,al:"center",wrap:1}}; };
  var rows=[title(B("All entries","എല്ലാ എൻട്രികളും")),[{v:B("Use the filter arrows to search and filter","ഫിൽട്ടർ ചെയ്യാനും തിരയാനും"),s:{sz:9,color:GREY}}],
   [hdr("Date\nതീയതി"),hdr("In / Out\nവരവ്/ചിലവ്"),hdr("Category\nവിഭാഗം"),hdr("Amount\nതുക"),hdr("Vehicle\nവാഹനം"),hdr("Customer\nകസ്റ്റമർ"),hdr("Paid by\nപേയ്മെന്റ്"),hdr("Note\nകുറിപ്പ്"),hdr("Source\nഎവിടെ നിന്ന്")]];
  list.slice().sort(function(p,q){ return p.date<q.date?-1:p.date>q.date?1:String(p.created).localeCompare(String(q.created)); }).forEach(function(e){
   var drv=a.isDrv(e), v=a.vById(e.vehId), isIn=e.type==="in"&&!drv;
   rows.push([txt(dmy(e.date)),txt(drv?"Driver tip (info) · ടിപ്പ്":isIn?"Income · വരവ്":"Expense · ചിലവ്",{color:drv?GREY:isIn?GRN:RED}),txt(a.catLabel(e.cat)),
    mon(e.amount,{color:drv?GREY:isIn?GRN:RED}),txt(v?(v.name||"")+(v.no?" "+v.no:""):(e.vehName||"")),txt(e.customer||""),txt(e.mode||""),txt([e.note,e.litres?e.litres+" L":""].filter(Boolean).join(" · ")),
    txt(e.src==="bill"?"Bill · ബിൽ":e.src==="old"?"Old accounts":"Typed · ടൈപ്പ്")]);
  });
  return {name:"All entries - എൻട്രികൾ",rows:rows,widths:[11,20,24,12,22,22,10,40,14],freeze:"A4",filter:"A3:I"+Math.max(4,rows.length),heights:{3:32}};
 }

 /* =========================== button =========================== */
 window.tcAbXlsx=async function(){
  var a=A(), tr=window.__tcTrApi;
  if(!a||!a.filtered||!tr){ say(B("Excel is not ready - please reopen Accounts","Excel തയ്യാറായിട്ടില്ല - അക്കൗണ്ട്സ് വീണ്ടും തുറക്കുക")); return; }
  var list=a.filtered();
  if(!list.length){ say(B("Nothing to export for this selection","ഈ തിരഞ്ഞെടുപ്പിൽ എക്സ്പോർട്ട് ചെയ്യാൻ ഒന്നുമില്ല")); return; }
  var bytes;
  try{
   var trips=tr.allTrips();
   bytes=workbook([summarySheet(a,list,trips),tripsSheet(a,list,trips),entriesSheet(a,list)]);
  }catch(e){ if(window.console) console.error(e); say(B("Could not make the Excel file","Excel ഫയൽ ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല")); return; }
  var name="TravelConnect_Accounts_"+a.todayIso()+".xlsx", type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  try{
   var file=new File([bytes],name,{type:type});
   if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; }
  }catch(e){ if(e&&e.name==="AbortError") return; }
  try{
   var url=URL.createObjectURL(new Blob([bytes],{type:type}));
   var l=document.createElement("a"); l.href=url; l.download=name; document.body.appendChild(l); l.click();
   setTimeout(function(){ try{ document.body.removeChild(l); URL.revokeObjectURL(url); }catch(e){} },1500);
   say(B("Excel saved to your downloads","Excel ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു"));
  }catch(e){ say(B("Could not export","എക്സ്പോർട്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല")); }
 };
})();
