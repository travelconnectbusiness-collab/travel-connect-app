/* Voice (tc-voice.js, loaded by tc-regdocs.js).
   One small round microphone button, for the business owner (shop and taxi / travel), on every page:
   1. A text box is open (cursor in it) -> tap the mic and SAY it: the words are typed into that box (Malayalam or English).
   2. No box open -> a voice window: say a COMMAND or a QUESTION.
        Commands (nothing is saved until the owner taps "Yes, save"):   "ഇന്ന് 500 രൂപ ഡീസൽ ചെലവ്"  /  "2 Alpha വിറ്റു" (shop)
        Questions (answered from the owner's own figures):             "ഈ മാസം ലാഭം എത്ര?"  /  "ആരൊക്കെ പണം തരാനുണ്ട്?"  /  "Alpha സ്റ്റോക്ക് എത്ര?"
   Understanding the words is rule based and runs inside the phone (a fixed set of sentences); the speech-to-text itself is done by the phone's Chrome (needs internet).
   The words can also be typed or corrected in the window, so it works on a phone without speech support too. Never shown to customers or to a shop staff phone. */
(function(){
 if(window.__tcVoice) return;
 window.__tcVoice=1;
 var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var LSg=function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, LSs=function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} };
 var p2=function(n){ return (n<10?"0":"")+n; };
 function ymd(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function today(){ return ymd(new Date()); }
 function addDays(s,n){ var d=new Date(s+"T00:00:00"); d.setDate(d.getDate()+n); return ymd(d); }
 function shopUi(){ return window.__tcShopUi&&window.__tcShop?window.__tcShopUi:null; }
 function shopOpen(){ var u=shopUi(); return !!(u&&u.isOpen()); }
 function DB(){ try{ return typeof db!=="undefined"&&db?db:(window.db||null); }catch(e){ return window.db||null; } }   /* the app's "db" is a global that is not on window */
 /* the business opened in the app (owner 2026-11-19: with the SHOP business chosen, its dashboard open but not the shop book, questions got the taxi
    figures - one phone keeps both books). Vehicle types use the taxi book; every other type uses the shop book. */
 var VEHT={taxi_travel:1,auto_rickshaw:1,pickup_goods:1};
 function bizType(){ try{ return window.__tcBizOnScreen?String(window.__tcBizOnScreen()||""):""; }catch(e){ return ""; } }
 function shopPage(){ if(shopOpen()) return true; var b=bizType(); return !!b&&!VEHT[b]&&shopBook(); }
 function travelOn(){ var d=DB(); if(shopPage()) return false; return !!d&&(Array.isArray(d.trips)||Array.isArray(d.expenses)); }
 function tr(en,ml){ var u=shopOpen()?shopUi():null; if(u) return u.T(ml,en); try{ if(typeof tcBl==="function") return tcBl(en,ml); }catch(e){} return ml; }
 function say(m){ var u=shopUi(); try{ if(u&&shopOpen()) u.say(m); else toast(m); }catch(e){ try{ toast(m); }catch(e2){} } }
 function money0(n){ n=Math.round(+n||0); try{ return typeof money==="function"?money(n):"Rs."+n; }catch(e){ return "Rs."+n; } }
 function aiOk(){ try{ return typeof window.tcInsightsOk==="function"?!!window.tcInsightsOk():true; }catch(e){ return true; } }   /* questions and commands: the top plan (dictation into a box stays free) */
 function lang(){ return LSg("tc_voice_lang")==="en-IN"?"en-IN":"ml-IN"; }

 /* ---------- understanding the words ---------- */
 function norm(s){
  s=String(s||"").toLowerCase().replace(/[‌‍]/g,"");
  s=s.replace(/[൦-൯]/g,function(c){ return String(c.charCodeAt(0)-0x0d66); });   /* Malayalam digits */
  s=s.replace(/ൻ്?റ/g,"ന്റ");   /* "വാഹനത്തിൻറെ" / "വാഹനത്തിൻ്റെ" typed the old way = "വാഹനത്തിന്റെ" */
  return s.replace(/\s+/g," ").trim();
 }
 function has(s,L){ for(var i=0;i<L.length;i++) if(s.indexOf(L[i])>=0) return true; return false; }
 var WORDS=[["പതിനായിരം",10000],["തൊള്ളായിരം",900],["അയ്യായിരം",5000],["നാലായിരം",4000],["മൂവായിരം",3000],["രണ്ടായിരം",2000],["ആയിരം",1000],["എണ്ണൂറ്",800],["എഴുനൂറ്",700],["അറുനൂറ്",600],["അഞ്ഞൂറ്",500],["നാനൂറ്",400],["മുന്നൂറ്",300],["ഇരുനൂറ്",200],["നൂറ്",100]];
 var CUR="(?:രൂപ|rs\\.?|rupees?|inr|₹)";
 /* the amount in the words: a number next to "രൂപ / Rs / ₹" first, otherwise the first number; "5 thousand / 5 ആയിരം / 2 lakh" are understood; a few Malayalam number words too */
 function amount(s){
  var m=new RegExp("(\\d+(?:[.,]\\d+)*)\\s*"+CUR).exec(s)||new RegExp(CUR+"\\s*(\\d+(?:[.,]\\d+)*)").exec(s)||/(\d+(?:[.,]\d+)*)/.exec(s);
  if(m){
   var v=parseFloat(m[1].replace(/,/g,"")), rest=s.slice(m.index+m[0].length);
   if(/^\s*(thousand|k\b|ആയിരം)/.test(rest)) v*=1000; else if(/^\s*(lakh|ലക്ഷം)/.test(rest)) v*=100000; else if(/^\s*(hundred|നൂറ്)/.test(rest)) v*=100;
   return v>0?v:0;
  }
  for(var i=0;i<WORDS.length;i++) if(s.indexOf(WORDS[i][0])>=0) return WORDS[i][1];
  return 0;
 }
 function qtyOf(s){   /* a number NOT written as money: "2 Alpha വിറ്റു" -> 2 */
  var re=/(\d+(?:\.\d+)?)/g, m;
  while((m=re.exec(s))){ var after=s.slice(m.index+m[0].length), before=s.slice(0,m.index);
   if(new RegExp("^\\s*"+CUR).test(after)||new RegExp(CUR+"\\s*$").test(before)) continue;
   return parseFloat(m[1])>0?parseFloat(m[1]):1; }
  return 1;
 }
 function dateOf(s){ return has(s,["ഇന്നലെ","yesterday"])?addDays(today(),-1):today(); }
 function period(s){
  var t=today(), mon=t.slice(0,7);
  if(has(s,["ഇന്നലെ","yesterday"])) { var y=addDays(t,-1); return {a:y,b:y,ml:"ഇന്നലെ",en:"yesterday"}; }
  if(has(s,["ഇന്ന്","ഇന്നത്തെ","today"])) return {a:t,b:t,ml:"ഇന്ന്",en:"today"};
  if(has(s,["കഴിഞ്ഞ മാസ","last month","previous month"])){ var y0=+mon.slice(0,4), m0=+mon.slice(5,7)-1; if(m0<1){ m0=12; y0--; } var last=new Date(y0,m0,0).getDate(), pm=y0+"-"+p2(m0); return {a:pm+"-01",b:pm+"-"+p2(last),ml:"കഴിഞ്ഞ മാസം",en:"last month"}; }
  if(has(s,["ഈ ആഴ്ച","this week","last 7 days"])) return {a:addDays(t,-6),b:t,ml:"കഴിഞ്ഞ 7 ദിവസം",en:"the last 7 days"};
  /* a month by name: "നവംബറിലെ", "october", "oct" (this year; a later month = last year) */
  var MN=[["ജനുവരി","january","jan"],["ഫെബ്രുവരി","february","feb"],["മാർച്ച","march"],["ഏപ്രി","april","apr"],["മേയ്","മെയ്"],["ജൂൺ","ജൂണ","june","jun"],["ജൂലൈ","july","jul"],["ഓഗസ്റ്റ","ആഗസ്റ്റ","august","aug"],["സെപ്റ്റംബ","september","sept"],["ഒക്ടോബ","october","oct"],["നവംബ","november","nov"],["ഡിസംബ","december","dec"]];   /* Malayalam stems: "ഒക്ടോബർ" / "ഒക്ടോബറിലെ" */
  var MLN=["ജനുവരി","ഫെബ്രുവരി","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ","ജൂലൈ","ഓഗസ്റ്റ്","സെപ്റ്റംബർ","ഒക്ടോബർ","നവംബർ","ഡിസംബർ"], ENN=["January","February","March","April","May","June","July","August","September","October","November","December"];
  for(var mi=0;mi<12;mi++){
   if(MN[mi].some(function(w){ return /^[a-z]/.test(w)?(" "+s+" ").indexOf(" "+w+" ")>=0:s.indexOf(w)>=0; })){
    var yy=+mon.slice(0,4); if(mi+1>+mon.slice(5,7)) yy--;
    var mm=yy+"-"+p2(mi+1), dl=new Date(yy,mi+1,0).getDate();
    return {a:mm+"-01",b:mm+"-"+p2(dl),ml:MLN[mi]+" "+yy,en:ENN[mi]+" "+yy};
   }
  }
  return {a:mon+"-01",b:mon+"-31",ml:"ഈ മാസം",en:"this month"};   /* the whole month, like the Day Book's month strip */
 }
 /* which business the question is about (owner 2026-11-19: on the taxi page "മൃതസഞ്ജീവനി ഷോപ്പിന്റെ ചത്ത മീനുകളുടെ നഷ്ടം" got the taxi figures).
    The words decide first, the page on screen only when the words do not say. */
 var SHOPCUE=["ഷോപ്പ","ഷോപ്","കടയ","കടയിൽ","കടയുടെ","കടയിലെ"," shop","store","അക്വേറിയം","aquarium","പെറ്റ് ഷോപ്പ","ചത്ത","ചത്തു","മീൻ","മീനു","fish","dead","died","സ്റ്റോക്ക്","stock","സാധന","item","സപ്ലൈയർ","supplier","വിറ്റ","sold","വാങ്ങിയ സാധന","purchase"];
 var TRVCUE=["ട്രിപ്പ","trip","ടാക്സി","taxi","ട്രാവൽ","travel","വണ്ടി","vehicle","ഓട്ടം","ഓടി","km","കിലോമീറ്റർ","ഡ്രൈവർ","driver","ബുക്കിംഗ്","booking","ക്വട്ടേഷൻ","quotation","ബാറ്റ","bata","ടോൾ","toll","ഡീസൽ","diesel"];
 function shopNameHit(s){   /* the shop's own name said in the question ("മൃതസഞ്ജീവനി" = "Mrithasanjeevani") */
  try{
   var nm=String(window.__tcShop.cfg("name","")||""); if(!nm) return false;
   var ks=nm.split(/[\s&,.-]+/).map(skel).filter(function(k){ return k.length>=4; }); if(!ks.length) return false;
   var qs=s.split(/[\s,.?!]+/).map(skel);
   return ks.some(function(k){ return qs.some(function(q){ return q.indexOf(k.slice(0,5))===0; }); });
  }catch(e){ return false; }
 }
 var SHOPT={T:function(ml,en){ return tr(en,ml); }};   /* stands in for the shop screen when the shop book is used without its screen open */
 function shopBook(){ try{ var S=window.__tcShop; return !!(S&&S.products&&S.products().length); }catch(e){ return false; } }
 var KW={
  sold:["വിറ്റു","വിറ്റ","വില്പന","വിൽപ്പന നടത്തി","sold","sale of"],
  qWord:["?","എത്ര","how much","how many","what","which","who","ആർക്കൊക്കെ","ആരൊക്കെ","ആരാണ്","ഏതൊക്കെ","ഏതാണ്","ഉണ്ടോ","പറയൂ","പറയു","കാണിക്ക","tell me","show me","list"],
  expense:["ചെലവ","ചിലവ","expense","spent","spend","ഡീസൽ","ഡീസല്","പെട്രോൾ","ഇന്ധന","diesel","petrol","fuel","ടോൾ","toll","പാർക്കിംഗ്","പാർക്കിങ്","parking","വാടക","rent","വൈദ്യുതി","കറന്റ്","electric","കൂലി","ശമ്പള","salary","wage","റിപ്പയർ","repair","സർവീസ്","service","പാക്കിംഗ്","packing","emi","ഭക്ഷണം","food"],
  profit:["ലാഭ","profit"], sales:["വിൽപ്പന","വില്പന","വരുമാന","വരവ്","വരവു","കളക്ഷൻ","കലക്ഷൻ","ടേൺഓവർ","ഓട്ടം കിട്ടിയ","കിട്ടിയ","sales","income","revenue","earning","earned","turnover","ബില്ലിംഗ്","ബില്ല്","billing","collection"],
  sum:["മൊത്തം","ആകെ","ടോട്ടൽ","കണക്ക്","total","summary","overall","എങ്ങനെയുണ്ട്","how is","how are"],
  exp:["ചെലവ","ചിലവ","expense","spent","spending"], dues:["തരാനുണ്ട്","കിട്ടാനുണ്ട്","തരാനുള്ള","കിട്ടാനുള്ള","ബാക്കി തരാൻ","dues","owe","pending","outstanding","credit","കടം"], sup:["സപ്ലൈയർ","supplier","കൊടുക്കാനുണ്ട്","കൊടുക്കാനുള്ള"],
  stock:["സ്റ്റോക്ക്","സ്റ്റോക്","stock","തീർന്ന","തീർന്നു","തീരാറായ","out of stock","running out"], trips:["ട്രിപ്പ്","trip","ഓട്ടം"], insight:["ഇൻസൈറ്റ്","insight","ശ്രദ്ധിക്കേണ്ട","attention"]
 };
 /* Malayalam typed in English letters (Manglish) */
 [["qWord",["ethra","etra","aaroke","arokke","enthanu","entha","undo"]],["profit",["labham","laabham","lābham"]],["sales",["vilpana","vilppana","varav","varavu","varumanam","collection"]],
  ["exp",["chelav","chilav","chelavu","chilavu"]],["expense",["chelav","chilav","chelavu","chilavu","diesel"]],["dues",["tharanund","tharaanund","kittanund","kittaanund"]],
  ["sum",["mottham","aake","kanakk","kanakku"]],["sold",["vittu","vitt"]],["stock",["stokk","sttok","theernnu","theerarayi"]]].forEach(function(p){ if(KW[p[0]]) KW[p[0]]=KW[p[0]].concat(p[1]); });
 SHOPCUE.push(" kada"," kadayile"," kadayude"," meen"," chathu"," chatha");
 TRVCUE.push("vandi","ottam","odi");
 function expCat(s){
  if(travelOn()){
   if(has(s,["ഡീസൽ","ഡീസല്","പെട്രോൾ","ഇന്ധന","diesel","petrol","fuel"])) return "Fuel";
   if(has(s,["ടോൾ","toll"])) return "Toll";
   if(has(s,["പാർക്കിംഗ്","പാർക്കിങ്","parking"])) return "Parking";
   if(has(s,["റിപ്പയർ","repair","സർവീസ്","service"])) return "Repair";
   if(has(s,["വാടക","rent"])) return "Rent";
   if(has(s,["ശമ്പള","salary","കൂലി","wage","bata","ബത്ത"])) return "Salary";
   if(has(s,["ഭക്ഷണം","food"])) return "Food";
   return "Other";
  }
  if(has(s,["വാടക","rent"])) return "Rent";
  if(has(s,["വൈദ്യുതി","കറന്റ്","electric"])) return "Electricity";
  if(has(s,["കൂലി","ശമ്പള","salary","wage"])) return "Wage";
  if(has(s,["പാക്കിംഗ്","packing"])) return "Packing";
  if(has(s,["emi","ലോൺ","loan"])) return "Loan EMI";
  return "Miscellaneous";
 }
 function findProduct(s){
  if(!shopUi()) return null;
  var best=null;
  window.__tcShop.products().forEach(function(p){
   var n=norm(p.n); if(n.length>=2&&s.indexOf(n)>=0&&(!best||n.length>norm(best.n).length)) best=p;
  });
  return best;
 }

 /* ---------- the answers (each {ml,en}) ---------- */
 function A(ml,en){ return {kind:"answer",ml:ml,en:en}; }
 /* when the words chose the other business than the page on screen, say which book the answer is from */
 function tagSw(r,sw){
  if(!r||!sw||r.kind!=="answer") return r;
  if(sw==="shop"){ var nm=""; try{ nm=String(window.__tcShop.cfg("name","")||""); }catch(e){} return {kind:r.kind,ml:"കട"+(nm?" ("+nm+")":"")+": "+r.ml,en:"Shop"+(nm?" ("+nm+")":"")+": "+r.en}; }
  return {kind:r.kind,ml:"ടാക്സി / ട്രാവൽസ്: "+r.ml,en:"Taxi / travels: "+r.en};
 }
 function shopQuestion(s){
  var SH=window.__tcShop, P=period(s), p;
  if(has(s,KW.stock)){
   p=findProduct(s);
   if(p){ if(p.nt||p.stock==null) return A(p.n+": സ്റ്റോക്ക് എണ്ണുന്നില്ല.",p.n+": stock is not counted."); return A(p.n+": "+p.stock+" ബാക്കിയുണ്ട്"+(p.stock<=0?" (തീർന്നു)":"")+".",p.n+": "+p.stock+" left"+(p.stock<=0?" (out of stock)":"")+"."); }
   var out=SH.products().filter(function(x){ return !x.nt&&!x.comp&&x.stock!=null&&x.stock<=0; }).map(function(x){ return x.n; });
   var low=SH.products().filter(function(x){ return !x.nt&&!x.comp&&x.stock>0&&x.low>0&&x.stock<=x.low; }).map(function(x){ return x.n+" ("+x.stock+")"; });
   if(!out.length&&!low.length) return A("സ്റ്റോക്ക് തീർന്നതോ തീരാറായതോ ആയ സാധനം ഇല്ല.","Nothing is out of stock or running low.");
   return A((out.length?"തീർന്നത്: "+out.slice(0,6).join(", ")+(out.length>6?" +"+(out.length-6):"")+". ":"")+(low.length?"തീരാറായത്: "+low.slice(0,6).join(", ")+".":""),(out.length?"Out of stock: "+out.slice(0,6).join(", ")+(out.length>6?" +"+(out.length-6):"")+". ":"")+(low.length?"Running low: "+low.slice(0,6).join(", ")+".":""));
  }
  if(has(s,KW.sup)&&!has(s,KW.dues.slice(0,2).concat(["കിട്ടാ"]))){ var Ls=SH.ledger(); return A("സപ്ലൈയർമാർക്ക് ആകെ "+money0(Ls.supTotal)+" കൊടുക്കാനുണ്ട്.","You owe suppliers "+money0(Ls.supTotal)+" in all."); }
  if(has(s,KW.dues)){
   var L=SH.ledger(), list=L.cust.filter(function(e){ return e.owed>0.004; }).sort(function(a,b){ return b.owed-a.owed; });
   if(!list.length) return A("ആരും പണം തരാനില്ല.","Nobody owes you anything.");
   return A("ആകെ "+money0(L.custTotal)+" കിട്ടാനുണ്ട്: "+list.slice(0,4).map(function(e){ return e.n+" "+money0(e.owed); }).join(", ")+(list.length>4?" +"+(list.length-4)+" പേർ":"")+".","You have "+money0(L.custTotal)+" to collect: "+list.slice(0,4).map(function(e){ return e.n+" "+money0(e.owed); }).join(", ")+(list.length>4?" +"+(list.length-4)+" more":"")+".");
  }
  /* dead fish / damaged goods: "ചത്ത മീനുകളുടെ നഷ്ടം എത്ര", "dead loss this month" */
  if(has(s,["ചത്ത","ചത്തു","dead","died","കേടായ","damage","കേട് വന്ന"])||(has(s,["നഷ്ടം","loss"])&&!has(s,["ലാഭ","profit"]))){
   var RD=SH.report(P.a,P.b), top={};
   (RD.deadList||[]).forEach(function(z){ var n=z.p?z.p.n:"?"; top[n]=(top[n]||0)+(+z.r.x.q||0); });
   var tl=Object.keys(top).sort(function(a,b){ return top[b]-top[a]; }).slice(0,4).map(function(n){ return n+" "+top[n]; }).join(", ");
   if(!RD.deadQty) return A(P.ml+" ചത്തതോ കേടായതോ ആയ സാധനം ചേർത്തിട്ടില്ല.",P.en+": no dead or damaged goods entered.");
   return A(P.ml+" ചത്തത് / നഷ്ടം: "+RD.deadQty+" എണ്ണം, വാങ്ങിയ വിലയിൽ "+money0(RD.dead)+(tl?" ("+tl+")":"")+".",P.en+": dead / loss "+RD.deadQty+" pcs, "+money0(RD.dead)+" at cost"+(tl?" ("+tl+")":"")+".");
  }
  if(has(s,KW.profit)){
   if(LSg("tc_shop_simple")==="1") return A("ലാഭം മറച്ചിരിക്കുകയാണ് (ലാഭം മറയ്ക്കുക ഓൺ ആണ്).","Profit is hidden (Hide profit is on).");
   var R=SH.report(P.a,P.b);
   return A(P.ml+" ലാഭം "+money0(R.profit)+(R.gstOut>0?" (GST ഒഴികെ)":"")+". ചെലവ് "+money0(R.exp+R.dead)+" കഴിഞ്ഞ് "+money0(R.net)+".",P.en+": profit "+money0(R.profit)+(R.gstOut>0?" (without GST)":"")+". After expenses "+money0(R.exp+R.dead)+": "+money0(R.net)+".");
  }
  if(has(s,KW.exp)){ var R2=SH.report(P.a,P.b); return A(P.ml+" ചെലവ് "+money0(R2.exp)+".",P.en+": expenses "+money0(R2.exp)+"."); }
  if(has(s,KW.sales)){ var R3=SH.report(P.a,P.b); return A(P.ml+" വിൽപ്പന "+money0(R3.sales)+(R3.gstOut>0?" (GST ഉൾപ്പെടെ; GST "+money0(R3.gstOut)+")":"")+".",P.en+": sales "+money0(R3.sales)+(R3.gstOut>0?" (with GST; GST "+money0(R3.gstOut)+")":"")+"."); }
  return null;
 }
 /* ---------- which vehicle is meant: "മറാസോയുടെ" = "Marazzo", "ഇന്നോവ" = "Innova", or the last 4 digits of the number ----------
    Both the spoken Malayalam and the saved (English) name are turned into a sound skeleton (consonant groups, vowels dropped):
    Marazzo -> MRS, മറാസോ -> MRS; Innova -> NV, ഇന്നോവ -> NV; Ertiga -> RTK, എർട്ടിഗ -> RTK. */
 var MLS={"ക":"K","ഖ":"K","ഗ":"K","ഘ":"K","ങ":"N","ച":"S","ഛ":"S","ജ":"S","ഝ":"S","ഞ":"N","ട":"T","ഠ":"T","ഡ":"T","ഢ":"T","ണ":"N","ത":"T","ഥ":"T","ദ":"T","ധ":"T","ന":"N",
  "പ":"P","ഫ":"P","ബ":"P","ഭ":"P","മ":"M","ര":"R","റ":"R","ല":"L","ള":"L","ഴ":"L","വ":"V","ശ":"S","ഷ":"S","സ":"S","ഹ":"H","ൻ":"N","ൺ":"N","ർ":"R","ൽ":"L","ൾ":"L","ൿ":"K"};
 var LAS={b:"P",p:"P",f:"P",c:"K",k:"K",g:"K",q:"K",d:"T",t:"T",j:"S",s:"S",z:"S",v:"V",w:"V",m:"M",n:"N",r:"R",l:"L",h:"H"};
 function skel(w){
  w=String(w||"").toLowerCase().replace(/റ്റ/g,"ട").replace(/ന്റ/g,"ണ്ട").replace(/ph/g,"p").replace(/th/g,"t").replace(/sh/g,"s").replace(/ch/g,"s").replace(/x/g,"ks");
  var o="", last="";
  for(var i=0;i<w.length;i++){ var c=w[i], k=MLS[c]!=null?MLS[c]:(LAS[c]||""); if(k&&k!==last) o+=k; if(k) last=k; else if(/[aeiouy]/.test(c)) last=""; }
  return o;
 }
 var SUF=/(യുടെ|ുടെ|യുടേ|ുടേ|ിന്റെ|ന്റെ|ിന്റേ|ന്റേ|ടെ|ിൽ|ിനു|ിന്|ക്ക്|ിലെ|ിലേ).*$/;
 function alnum(x){ return String(x||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
 function vehList(B){
  var out=[], seen={};
  function put(name,no,id){ var k=alnum(no)||("N:"+String(name||"").toLowerCase().trim()); if(!String(name||"").trim()&&!alnum(no)) return; if(seen[k]){ if(!seen[k].name&&name) seen[k].name=name; if(seen[k].id==null&&id!=null) seen[k].id=id; return; } seen[k]={name:String(name||"").trim(),no:String(no||"").trim(),id:id}; out.push(seen[k]); }
  ((DB()&&DB().accVehicles)||[]).forEach(function(v){ if(v&&!v.deleted){ put(v.name,v.no,null); var k=alnum(v.no)||("N:"+String(v.name||"").toLowerCase().trim()); if(seen[k]) seen[k].aid=v.id; } });   /* Trip & Accounts book vehicles */
  ((DB()&&DB().vehicles)||[]).forEach(function(v){ put(v.name,v.no,v.id); });
  (B||[]).forEach(function(b){ put(b.vn,b.veh,null); });
  /* a vehicle known by name only: find its book vehicle by the same name */
  out.forEach(function(x){ if(x.aid) return; ((DB()&&DB().accVehicles)||[]).forEach(function(v){ if(!x.aid&&v&&!v.deleted&&((alnum(v.no)&&alnum(v.no)===alnum(x.no))||(v.name&&x.name&&skel(v.name)===skel(x.name)))) x.aid=v.id; }); });
  return out;
 }
 window.tcVoSkel=skel;   /* for the test */
 function vehOf(s,B){
  var words=s.split(/[\s,.?!]+/).filter(Boolean), sk=[];
  words.forEach(function(w){ var a=skel(w), b=skel(w.replace(SUF,"")); if(a) sk.push(a); if(b&&b!==a) sk.push(b); });
  var digits=s.replace(/\D+/g," "), best=null, bs=0;
  vehList(B).forEach(function(v){
   var sc=0, tail=alnum(v.no).replace(/\D/g,"").slice(-4);
   if(tail.length===4&&(" "+digits+" ").indexOf(" "+tail+" ")>=0) sc=10;
   String(v.name||"").split(/[\s\-\/]+/).forEach(function(nw){
    var k=skel(nw); if(k.length<2) return;
    sk.forEach(function(x){ if(x===k) sc=Math.max(sc,k.length+3); else if(k.length>=3&&x.indexOf(k)===0) sc=Math.max(sc,k.length+1); });
   });
   if(sc>bs){ bs=sc; best=v; }
  });
  return bs>=4?best:null;
 }
 function billOfVeh(b,v){
  if(alnum(v.no)&&alnum(b.veh)) return alnum(v.no)===alnum(b.veh);
  if(!v.name||!b.vn) return false;
  return skel(b.vn)===skel(v.name)||String(b.vn).toLowerCase().indexOf(String(v.name).toLowerCase())>=0;
 }
 function travelQuestion(s){
  var P=period(s), B=typeof window.tcTrBills==="function"?window.tcTrBills():[], ex=(DB()&&DB().expenses)||[];
  function inP(d){ return d>=P.a&&d<=P.b; }
  var V=vehOf(s,B);
  /* the Trip & Accounts book = money really received / spent (same as the Day Book); bills = what was billed for trips */
  var BK=null; try{ BK=typeof window.tcTrBook==="function"?window.tcTrBook(P.a,P.b):null; }catch(e){ BK=null; }
  function pfMl(p){ return p>=0?"ലാഭം "+money0(p):"നഷ്ടം "+money0(-p)+" (ചെലവ് വരവിനെക്കാൾ കൂടുതൽ)"; }
  function pfEn(p){ return p>=0?"profit "+money0(p):"loss "+money0(-p)+" (spent more than received)"; }
  var noneMl=BK&&BK.none.n?" വാഹനം തിരഞ്ഞെടുക്കാത്ത "+BK.none.n+" എൻട്രി (വരവ് "+money0(BK.none.inc)+", ചെലവ് "+money0(BK.none.out)+") ഇതിൽ കൂട്ടിയിട്ടില്ല.":"";
  var noneEn=BK&&BK.none.n?" "+BK.none.n+" entr"+(BK.none.n>1?"ies":"y")+" with no vehicle chosen (income "+money0(BK.none.inc)+", expenses "+money0(BK.none.out)+") are not in this.":"";
  if(V&&!has(s,KW.dues)){
   var vb=B.filter(function(b){ return inP(b.d)&&billOfVeh(b,V); }), vt=0; vb.forEach(function(b){ vt+=b.fin; });
   var vnm=(V.name||V.no)+(V.name&&V.no?" ("+V.no+")":"");
   var billMl=" ബില്ലുകൾ: "+vb.length+" ട്രിപ്പ്, "+money0(vt)+".", billEn=" Bills: "+vb.length+" trip(s), "+money0(vt)+".";
   var g=BK&&V.aid?(BK.veh[V.aid]||{inc:0,out:0,n:0}):null;
   if(g){
    if(has(s,KW.exp)&&!has(s,KW.sales)&&!has(s,KW.profit)) return A(vnm+" - "+P.ml+" ചെലവ് "+money0(g.out)+"."+noneMl,vnm+" - "+P.en+": expenses "+money0(g.out)+"."+noneEn);
    return A(vnm+" - "+P.ml+" (കണക്ക് ബുക്ക്): വരവ് "+money0(g.inc)+", ചെലവ് "+money0(g.out)+", "+pfMl(g.inc-g.out)+"."+billMl+noneMl,
     vnm+" - "+P.en+" (accounts book): income "+money0(g.inc)+", expenses "+money0(g.out)+", "+pfEn(g.inc-g.out)+"."+billEn+noneEn);
   }
   return A(vnm+" - "+P.ml+":"+billMl+(BK?" ഈ വാഹനം കണക്ക് ബുക്കിൽ ഇല്ല (Trip & Accounts › Vehicle Book-ൽ ചേർത്താൽ വരവും ചെലവും കിട്ടും).":""),
    vnm+" - "+P.en+":"+billEn+(BK?" This vehicle is not in the accounts book (add it in Trip & Accounts › Vehicle Book to get income and expenses).":""));
  }
  var bl=B.filter(function(b){ return inP(b.d); }), billed=0; bl.forEach(function(b){ billed+=b.fin; });
  if(BK&&!has(s,KW.dues)&&!has(s,KW.trips)){
   var bML=" ബില്ല് ചെയ്തത്: "+bl.length+" ട്രിപ്പ്, "+money0(billed)+".", bEN=" Billed: "+bl.length+" trip(s), "+money0(billed)+".";
   if(has(s,KW.exp)&&!has(s,KW.sales)&&!has(s,KW.profit)) return A(P.ml+" ചെലവ് "+money0(BK.out)+" (കണക്ക് ബുക്ക്).",P.en+": expenses "+money0(BK.out)+" (accounts book).");
   if(has(s,KW.profit)||has(s,KW.sales)||has(s,KW.sum)||has(s,KW.qWord))
    return A(P.ml+" (കണക്ക് ബുക്ക്): വരവ് "+money0(BK.inc)+", ചെലവ് "+money0(BK.out)+", "+pfMl(BK.inc-BK.out)+"."+bML,P.en+" (accounts book): income "+money0(BK.inc)+", expenses "+money0(BK.out)+", "+pfEn(BK.inc-BK.out)+"."+bEN);
  }
  var spent=0; ex.forEach(function(e){ var d=String(e.created||"").slice(0,10); if(inP(d)) spent+=+e.amount||0; });
  if(has(s,KW.dues)){
   var owing=B.filter(function(b){ return b.bal>=1; }), by={}, tot=0;
   owing.forEach(function(b){ var c=by[b.key]||(by[b.key]={nm:b.nm||"-",v:0}); c.v+=b.bal; tot+=b.bal; });
   var cl=Object.keys(by).map(function(k){ return by[k]; }).sort(function(a,b){ return b.v-a.v; });
   if(!cl.length) return A("ആരും പണം തരാനില്ല.","Nobody owes you anything.");
   return A("ആകെ "+money0(tot)+" കിട്ടാനുണ്ട്: "+cl.slice(0,4).map(function(c){ return c.nm+" "+money0(c.v); }).join(", ")+(cl.length>4?" +"+(cl.length-4)+" പേർ":"")+".","You have "+money0(tot)+" to collect: "+cl.slice(0,4).map(function(c){ return c.nm+" "+money0(c.v); }).join(", ")+(cl.length>4?" +"+(cl.length-4)+" more":"")+".");
  }
  if(has(s,KW.trips)) return A(P.ml+" "+bl.length+" ട്രിപ്പ് (ബില്ല് "+money0(billed)+").",P.en+": "+bl.length+" trip(s), billed "+money0(billed)+".");
  if(has(s,KW.profit)) return A(P.ml+" ബില്ല് "+money0(billed)+", ചെലവ് "+money0(spent)+", ബാക്കി "+money0(billed-spent)+" (ഏകദേശ ലാഭം).",P.en+": billed "+money0(billed)+", spent "+money0(spent)+", left "+money0(billed-spent)+" (about the profit).");
  if(has(s,KW.exp)) return A(P.ml+" ചെലവ് "+money0(spent)+".",P.en+": expenses "+money0(spent)+".");
  if(has(s,KW.sales)) return A(P.ml+" വരവ് (ബില്ല്) "+money0(billed)+" ("+bl.length+" ട്രിപ്പ്).",P.en+": billed "+money0(billed)+" ("+bl.length+" trip(s)).");
  if(has(s,KW.sum)||has(s,KW.qWord)) return A(P.ml+": "+bl.length+" ട്രിപ്പ്, വരവ് "+money0(billed)+", ചെലവ് "+money0(spent)+", ബാക്കി "+money0(billed-spent)+".",P.en+": "+bl.length+" trip(s), billed "+money0(billed)+", spent "+money0(spent)+", left "+money0(billed-spent)+".");
  return null;
 }

 /* ---------- what to do with the words: {kind:'confirm'|'answer'|'open'|'none'} ---------- */
 function run(raw){
  var s=norm(raw); if(!s) return {kind:"none",ml:"ഒന്നും കേട്ടില്ല.",en:"Nothing heard."};
  /* "how / where do I ..." about the app itself: answered first, on every plan and every business (tc-vohelp.js) */
  var hp=null; try{ hp=typeof window.tcVoHelp==="function"?window.tcVoHelp(raw):null; }catch(e){ hp=null; }
  if(hp&&hp.intent) return hp;
  if(!aiOk()&&hp&&!amount(s)) return hp;   /* "500 rupees diesel expense" is a command (Platinum), not a help question */
  if(!aiOk()) return {kind:"none",ml:"വോയിസ് കമാൻഡും ചോദ്യവും Platinum പ്ലാനിൽ ലഭ്യമാണ്. (പറഞ്ഞ് ടൈപ്പ് ചെയ്യൽ - ടെക്സ്റ്റ് ബോക്സിൽ ടച്ച് ചെയ്ത ശേഷം മൈക്ക് - എല്ലാവർക്കും ഉണ്ട്.)",en:"Voice commands and questions are a Platinum feature. (Speaking into a text box - tap the box, then the mic - is for everyone.)"};
  var shop=shopPage()?(shopUi()||SHOPT):false, trv=travelOn(), isQ=has(s,KW.qWord), sw="";
  /* the words choose the business: a shop question on the taxi page is answered from the shop book (and the other way round) */
  var sc=has(" "+s,SHOPCUE)||shopNameHit(s), tc=has(s,TRVCUE)||(!!DB()&&!!vehOf(s,typeof window.tcTrBills==="function"?window.tcTrBills():[]));
  if(sc&&!tc&&!shop&&shopBook()){ shop=shopUi()||SHOPT; trv=false; sw="shop"; }
  else if(tc&&!sc&&shop&&DB()&&(Array.isArray(DB().trips)||Array.isArray(DB().accEntries))){ shop=false; trv=true; sw="trv"; }
  if(has(s,KW.insight)&&!isQ||/^(insights?|ഇൻസൈറ്റ്)/.test(s)){
   if(shop&&window.tsOpen) return {kind:"open",fn:function(){ window.tsOpen("insight"); },ml:"ഇൻസൈറ്റ് തുറക്കുന്നു.",en:"Opening insights."};
   if(trv&&window.tcTrInsightAll) return {kind:"open",fn:function(){ window.tcTrInsightAll(); },ml:"ഇൻസൈറ്റ് തുറക്കുന്നു.",en:"Opening insights."};
  }
  /* a sale (shop) */
  if(shop&&has(s,KW.sold)&&!isQ){
   var p=findProduct(s);
   if(!p) return {kind:"none",ml:"ഏത് സാധനം എന്ന് മനസ്സിലായില്ല. സാധനത്തിന്റെ പേര് ആപ്പിൽ ഉള്ളതുപോലെ പറയൂ, ഉദാ: \"2 Alpha വിറ്റു\".",en:"I could not find which item. Say the item's name as in the app, e.g. \"2 Alpha sold\"."};
   if(p.comp) return {kind:"none",ml:p.n+" ഒന്നിലധികം സാധനങ്ങൾ ചേർന്നതാണ് - വിൽപ്പന സ്ക്രീനിൽ ചേർക്കൂ.",en:p.n+" is a made-up item - add it from the Sale screen."};
   if(!(p.pr>0)) return {kind:"none",ml:p.n+"-ന് വില ഇല്ല - വിൽപ്പന സ്ക്രീനിൽ ചേർക്കൂ.",en:p.n+" has no price - add it from the Sale screen."};
   if(has(s,KW.dues)||has(s,["കടം","credit","ക്രെഡിറ്റ്"])) return {kind:"none",ml:"കടം വിൽപ്പനയ്ക്ക് കസ്റ്റമറുടെ പേര് വേണം - വിൽപ്പന സ്ക്രീനിൽ ചേർക്കൂ.",en:"A credit sale needs the customer's name - add it from the Sale screen."};
   var q=qtyOf(s.replace(norm(p.n)," ")), pm=has(s,["upi","യുപിഐ","gpay","ജിപേ","ഗൂഗിൾ പേ","phonepe","ഫോൺപേ"])?"U":has(s,["card","കാർഡ്"])?"D":"C", tot=q*p.pr;
   var warn=(!p.nt&&p.stock!=null&&p.stock<q)?{ml:" ⚠ സ്റ്റോക്ക് "+p.stock+" മാത്രമേ ഉള്ളൂ.",en:" ⚠ only "+p.stock+" in stock."}:{ml:"",en:""};
   var d=dateOf(s);
   return {kind:"confirm",ml:"വിൽപ്പന: "+p.n+" × "+q+" = "+money0(tot)+" ("+(pm==="U"?"UPI":pm==="D"?"കാർഡ്":"ക്യാഷ്")+(d!==today()?", "+d:"")+")."+warn.ml,en:"Sale: "+p.n+" × "+q+" = "+money0(tot)+" ("+(pm==="U"?"UPI":pm==="D"?"card":"cash")+(d!==today()?", "+d:"")+")."+warn.en,
    save:function(){
     var rec={p:p.id,q:q,pr:p.pr,pm:pm,g:window.__tcShop.H.uid()};
     if(p.g>0&&window.__tcShop.cfg("gst","0")==="1") rec.gr=p.g;
     if(window.__tcShop.isStaff()){ return false; }
     return !!window.__tcShop.add("s",rec,d);
    }};
  }
  /* an expense (shop or travel): needs an amount, and is not a question */
  var aQ=null;   /* "ഇന്നോവയുടെ ചെലവ്" with no amount is a question, not an expense to save */
  if((shop||trv)&&has(s,KW.expense)&&!isQ&&!(amount(s)>0)&&
     (has(s,["മാസ","ആഴ്ച","ഇന്ന","ഇന്നലെ","month","week","today","yesterday"])||has(s,KW.sum)||has(s,KW.profit)||has(s,KW.sales)||(trv&&vehOf(s,typeof window.tcTrBills==="function"?window.tcTrBills():[])))){
   aQ=shop?shopQuestion(s):travelQuestion(s); if(aQ) return tagSw(aQ,sw); }
  if((shop||trv)&&has(s,KW.expense)&&!isQ){
   var a=amount(s);
   if(!(a>0)) return {kind:"none",ml:"തുക കേട്ടില്ല. ഉദാ: \"ഇന്ന് 500 രൂപ ഡീസൽ ചെലവ്\".",en:"I did not catch the amount. Example: \"500 rupees diesel expense today\"."};
   var cat=expCat(s), d2=dateOf(s), note=String(raw).trim().slice(0,80);
   return {kind:"confirm",ml:"ചെലവ്: "+money0(a)+" - "+cat+(d2!==today()?" ("+d2+")":"")+".",en:"Expense: "+money0(a)+" - "+cat+(d2!==today()?" ("+d2+")":"")+".",
    save:function(){
     if(shop) return !!window.__tcShop.add("e",{c:cat,a:a,t:note},d2);
     var D=DB(); if(!Array.isArray(D.expenses)) D.expenses=[];
     var n=new Date(); D.expenses.push({category:cat,description:note,amount:a,created:d2+"T"+p2(n.getHours())+":"+p2(n.getMinutes())+":"+p2(n.getSeconds())});
     try{ save(); }catch(e){} try{ if(window.tcTrInsightRefresh) tcTrInsightRefresh(); }catch(e){} return true;
    }};
  }
  /* a question */
  var ans=shop?shopQuestion(s):trv?travelQuestion(s):null;
  if(ans) ans=tagSw(ans,sw);
  if(ans) return ans;
  if(hp) return hp;
  if(!shop&&!trv) return {kind:"none",ml:"ഇവിടെ വോയിസ് കമാൻഡ് ഇല്ല. ടെക്സ്റ്റ് ബോക്സിൽ ടച്ച് ചെയ്ത ശേഷം മൈക്ക് അമർത്തിയാൽ പറഞ്ഞത് ടൈപ്പ് ആകും.",en:"No voice commands here. Tap a text box, then the mic, and what you say is typed."};
  if(shop) return {kind:"none",ml:"മനസ്സിലായില്ല. ഇങ്ങനെ ചോദിക്കാം: \"ഈ മാസം ലാഭം എത്ര\", \"Alpha സ്റ്റോക്ക് എത്ര\", \"ആരൊക്കെ പണം തരാനുണ്ട്\", \"2 Alpha വിറ്റു\".",
   en:"I did not understand. You can ask: \"profit this month\", \"how much Alpha stock\", \"who owes me money\", \"2 Alpha sold\"."};
  var vx=vehList(typeof window.tcTrBills==="function"?window.tcTrBills():[])[0], vn=vx&&(vx.name||vx.no)?String(vx.name||vx.no).split(/\s+/).pop():"";
  return {kind:"none",ml:"മനസ്സിലായില്ല. ഇങ്ങനെ ചോദിക്കാം: \"ഈ മാസത്തെ വരവ് എത്ര\""+(vn?", \""+vn+" ഈ മാസം എത്ര ഓടി\"":"")+", \"ആരൊക്കെ പണം തരാനുണ്ട്\", \"ഇന്ന് 500 രൂപ ഡീസൽ ചെലവ്\".",
   en:"I did not understand. You can ask: \"income this month\""+(vn?", \""+vn+" income this month\"":"")+", \"who owes me money\", \"500 rupees diesel expense today\"."};
 }
 window.tcVoiceRun=function(t){ var r=run(t); return {kind:r.kind,ml:r.ml,en:r.en,lang:(typeof window.tcVoLangOf==="function"?window.tcVoLangOf(t):""),demo:r.demo?r.demo.length:0}; };   /* used by the test */
 window.tcVoiceParse={amount:function(t){ return amount(norm(t)); },run:run};

 /* ---------- listening ---------- */
 var rec=null, listening=false;
 function stopListen(){ try{ if(rec) rec.stop(); }catch(e){} }
 function listen(onText,onDone){
  if(!SR){ say(tr("This phone cannot recognise speech - type it instead","ഈ ഫോണിൽ ശബ്ദം തിരിച്ചറിയില്ല - ടൈപ്പ് ചെയ്താലും മതി")); if(onDone) onDone(); return; }
  if(listening){ stopListen(); return; }
  var r=new SR(), got="";
  r.lang=lang(); r.interimResults=true; r.continuous=false; r.maxAlternatives=1;
  r.onresult=function(ev){
   var s=""; for(var i=0;i<ev.results.length;i++) s+=ev.results[i][0].transcript+" ";
   got=s.trim(); onText(got,!!(ev.results[ev.results.length-1]&&ev.results[ev.results.length-1].isFinal));
  };
  r.onerror=function(ev){ var e=ev&&ev.error;
   if(e==="not-allowed"||e==="service-not-allowed") say(tr("Allow the microphone for this site in Chrome","Chrome-ൽ ഈ സൈറ്റിന് മൈക്ക് അനുവദിക്കുക"));
   else if(e==="no-speech") say(tr("Nothing heard - try again","ഒന്നും കേട്ടില്ല - ഒന്നുകൂടി പറയൂ"));
   else if(e==="network") say(tr("Speech needs the internet","ശബ്ദം തിരിച്ചറിയാൻ ഇന്റർനെറ്റ് വേണം")); };
  r.onend=function(){ listening=false; rec=null; setFab(); if(onDone) onDone(got); };
  try{ rec=r; listening=true; setFab(); r.start(); }catch(e){ listening=false; rec=null; setFab(); }
 }

 /* ---------- the button ---------- */
 var ICON_MIC='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>';
 var ICON_STOP='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>';
 var ICON_PEN='<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>';
 var fab=null;
 function textField(){
  var a=document.activeElement; if(!a) return null;
  if(a.tagName==="TEXTAREA") return a;
  if(a.tagName==="INPUT"&&/^(text|search|tel|number|email|url|)$/i.test(a.getAttribute("type")||"")) return a;
  return null;
 }
 function allowed(){
  try{ var u=window.getCurrentUser&&getCurrentUser(); if(!u||u.role==="customer") return false; }catch(e){ return false; }
  try{ if(window.__tcShop&&window.__tcShop.isStaff()) return false; }catch(e){}
  return true;
 }
 function setFab(){
  if(!fab) return;
  var ok=allowed(); fab.style.display=ok?"flex":"none";
  fab.style.background=listening?"#c5372c":"#0b6b78";
  fab.style.boxShadow=listening?"0 0 0 5px rgba(197,55,44,.22),0 1px 4px rgba(0,0,0,.3)":"0 1px 4px rgba(0,0,0,.28)";
  var ic=fab.querySelector("span"); var want=listening?"s":"m"; if(ic.getAttribute("data-i")!==want){ ic.setAttribute("data-i",want); ic.innerHTML=listening?ICON_STOP:ICON_MIC; }
  var f=textField(); fab.querySelector("i").style.display=f?"flex":"none";
 }
 function makeFab(){
  if(fab||!document.body) return;
  fab=document.createElement("button"); fab.id="tcVoiceFab"; fab.type="button";
  fab.setAttribute("aria-label","Voice");
  fab.style.cssText="position:fixed;right:14px;bottom:84px;z-index:99990;width:42px;height:42px;border-radius:50%;border:0;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.28);display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;opacity:.92;position:fixed;-webkit-tap-highlight-color:transparent";
  var ic=document.createElement("span"); ic.style.cssText="display:flex;line-height:0"; fab.appendChild(ic);
  var badge=document.createElement("i"); badge.innerHTML=ICON_PEN; badge.style.cssText="position:absolute;top:-3px;right:-3px;background:#fff;border-radius:50%;width:17px;height:17px;color:#0b6b78;display:none;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(0,0,0,.15)";
  fab.appendChild(badge);
  /* keep the cursor in the text box while the button is tapped */
  fab.addEventListener("pointerdown",function(e){ e.preventDefault(); });
  fab.addEventListener("mousedown",function(e){ e.preventDefault(); });
  fab.addEventListener("click",function(){ tap(); });
  document.body.appendChild(fab);
  setFab();
 }
 function tap(){
  var f=textField();
  if(f){   /* dictation into the box */
   if(listening){ stopListen(); return; }
   var base=f.value, isNum=f.getAttribute("type")==="number";
   listen(function(txt){
    var v;
    if(isNum){ var a=amount(norm(txt)); v=a>0?String(a):""; }
    else v=(base&&!/\s$/.test(base)?base+" ":base)+txt;
    if(v!==""){ f.value=v; try{ f.dispatchEvent(new Event("input",{bubbles:true})); }catch(e){} }
   },function(){ try{ f.dispatchEvent(new Event("change",{bubbles:true})); }catch(e){} });
   return;
  }
  openSheet();
 }

 /* ---------- the voice window ---------- */
 var pending=null, last=null;
 function sheetHtml(){
  var l=lang();
  return '<div style="font-weight:700;font-size:16px;margin-bottom:8px;color:#0b6b78">'+E(tr("Say it","പറയൂ"))+'</div>'+
   '<div style="display:flex;gap:6px;margin-bottom:6px"><button type="button" id="tcVoMic" style="flex:1;padding:12px;border:0;border-radius:12px;background:#0b6b78;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;gap:8px"><span style="display:flex;line-height:0">'+ICON_MIC+'</span>'+E(tr("Tap and speak","അമർത്തി പറയൂ"))+'</button>'+
   '<button type="button" id="tcVoLg" style="padding:0 12px;border:1px solid #bbb;border-radius:12px;background:#fff;font-size:13px">'+(l==="ml-IN"?"മലയാളം":"English")+'</button></div>'+
   '<textarea id="tcVoTx" rows="2" style="width:100%;box-sizing:border-box;border:1px solid #bbb;border-radius:10px;padding:8px;font-size:15px" placeholder="'+E(tr("what you said appears here - you can also type","പറഞ്ഞത് ഇവിടെ വരും - ടൈപ്പ് ചെയ്യുകയും ആവാം"))+'"></textarea>'+
   '<div style="display:flex;gap:6px;margin-top:6px"><button type="button" id="tcVoGo" style="flex:1;padding:10px;border:0;border-radius:10px;background:#0b6b78;color:#fff;font-size:15px">'+E(tr("Do it","ചെയ്യൂ"))+'</button><button type="button" id="tcVoX" style="padding:10px 14px;border:1px solid #bbb;border-radius:10px;background:#fff;font-size:15px">'+E(tr("Close","അടയ്ക്കുക"))+'</button></div>'+
   '<div id="tcVoOut" style="margin-top:8px"></div>'+
   '<div style="margin-top:6px;font-size:11.5px;color:#666;line-height:1.35">'+E(tr("Examples: \"500 rupees diesel expense today\", \"profit this month\", \"who owes me money\". Ask how to do anything in the app: \"where is the CA pack\". Chrome sends the voice to Google to turn it into text.","ഉദാ: \"ഇന്ന് 500 രൂപ ഡീസൽ ചെലവ്\", \"ഈ മാസം ലാഭം എത്ര\", \"ആരൊക്കെ പണം തരാനുണ്ട്\". ആപ്പിൽ എന്തും എങ്ങനെ ചെയ്യാം എന്ന് ചോദിക്കാം: \"CA പാക്ക് എവിടെ\". ശബ്ദം എഴുത്താക്കാൻ Chrome അത് Google-ലേക്ക് അയയ്ക്കും."))+'</div>';
 }
 function openSheet(){
  closeSheet();
  var o=document.createElement("div"); o.id="tcVoSheet";
  o.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:99995;background:#fff;border-radius:16px 16px 0 0;box-shadow:0 -4px 18px rgba(0,0,0,.35);padding:12px 12px calc(14px + env(safe-area-inset-bottom,0px));max-height:80vh;overflow:auto;font-family:inherit;color:#222";
  o.innerHTML=sheetHtml(); document.body.appendChild(o);
  $("tcVoMic").onclick=function(){ listen(function(txt,fin){ $("tcVoTx").value=txt; },function(txt){ if(txt) go(); }); };
  $("tcVoLg").onclick=function(){ LSs("tc_voice_lang",lang()==="ml-IN"?"en-IN":"ml-IN"); $("tcVoLg").textContent=lang()==="ml-IN"?"മലയാളം":"English"; };
  $("tcVoGo").onclick=go; $("tcVoX").onclick=closeSheet;
  $("tcVoTx").addEventListener("keydown",function(e){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); go(); } });
 }
 function closeSheet(){ stopListen(); var o=$("tcVoSheet"); if(o) o.remove(); pending=null; }
 function speak(text){
  try{ if(!window.speechSynthesis) return; speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(text); u.lang=lang(); speechSynthesis.speak(u); }catch(e){}
 }
 function go(){
  var tx=$("tcVoTx"), out=$("tcVoOut"); if(!tx||!out) return;
  var r=run(tx.value); last=r; pending=null;
  /* answer in the language of the question (Malayalam letters / Manglish -> Malayalam, English -> English) - tc-vohelp.js */
  var QL=""; try{ QL=typeof window.tcVoLangOf==="function"?window.tcVoLangOf(tx.value):""; }catch(e){ QL=""; }
  var msg=QL==="ml"?r.ml:(QL==="en"?r.en:tr(r.en,r.ml)), h="";
  if(r.kind==="confirm"){
   pending=r;
   h='<div style="background:#fff6df;border-radius:10px;padding:10px;font-size:15px">'+E(msg)+'</div>'+
    '<div style="display:flex;gap:6px;margin-top:6px"><button type="button" id="tcVoYes" style="flex:1;padding:11px;border:0;border-radius:10px;background:#0b6b78;color:#fff;font-size:15px">'+E(tr("Yes, save","ശരി, സേവ് ചെയ്യൂ"))+'</button><button type="button" id="tcVoNo" style="padding:11px 16px;border:1px solid #bbb;border-radius:10px;background:#fff;font-size:15px">'+E(tr("No","വേണ്ട"))+'</button></div>';
  }else if(r.kind==="answer"){
   h='<div style="background:#eef6f1;border-radius:10px;padding:10px;font-size:15px;line-height:1.45">'+E(msg)+'</div>'+(window.speechSynthesis?'<button type="button" id="tcVoSay" style="margin-top:6px;padding:8px 12px;border:1px solid #bbb;border-radius:10px;background:#fff;font-size:13px">'+E(tr("Read aloud","വായിച്ച് കേൾപ്പിക്കൂ"))+'</button>':'');
  }else if(r.kind==="help"){   /* app help: the steps, and "Open" when the place can be opened from here */
   h='<div style="background:#eef3f8;border-radius:10px;padding:10px;font-size:15px;line-height:1.5;white-space:pre-line">'+E(msg)+'</div>'+
    (r.demo&&r.demo.length?'<button type="button" id="tcVoDemoGo" style="margin-top:6px;margin-right:6px;padding:10px 16px;border:0;border-radius:10px;background:#f5a623;color:#082b49;font-weight:800;font-size:15px">'+E(QL==="ml"?"കാണിച്ചു തരൂ (ഡെമോ)":(QL==="en"?"Show me (demo)":tr("Show me (demo)","കാണിച്ചു തരൂ (ഡെമോ)")))+'</button>':'')+
    (r.go?'<button type="button" id="tcVoHelpGo" style="margin-top:6px;padding:10px 16px;border:0;border-radius:10px;background:#0b6b78;color:#fff;font-size:15px">'+E(tr("Open it","അവിടേക്ക് പോകുക"))+'</button>':'');
  }else if(r.kind==="open"){
   closeSheet(); try{ r.fn(); }catch(e){} return;
  }else h='<div style="background:#fdecec;border-radius:10px;padding:10px;font-size:14px;line-height:1.4">'+E(msg)+'</div>';
  /* IN-APP AI (tc-ai.js, 2026-11-19): help with no answer -> the AI is asked by itself; other help / "did not understand" -> an "Ask AI" button */
  var aiQ=String(tx.value||"").trim(), aiOn=typeof window.tcAskAi==="function"&&aiQ.length>=3&&(r.kind==="help"||r.kind==="none");
  if(aiOn) h+='<div id="tcVoAiOut" style="margin-top:8px"></div>'+(r.miss?'':'<button type="button" id="tcVoAiGo" style="margin-top:6px;padding:8px 14px;border:1px solid #7b5cd6;border-radius:999px;background:#f4f0ff;color:#4b2fa8;font-size:13.5px;font-weight:700">&#10024; '+E(QL==="ml"?"AI-യോട് ചോദിക്കൂ":(QL==="en"?"Ask AI":tr("Ask AI","AI-യോട് ചോദിക്കൂ")))+'</button>');
  out.innerHTML=h;
  if(aiOn){
   var aiL=QL||(tr("en","ml")==="ml"?"ml":"en");
   var askAi=function(){
    var o=$("tcVoAiOut"), b=$("tcVoAiGo"); if(!o) return; if(b) b.remove();
    o.innerHTML='<div style="background:#f4f0ff;border-radius:10px;padding:10px;font-size:14px;color:#4b2fa8">&#10024; '+E(aiL==="ml"?"AI ആലോചിക്കുന്നു...":"The AI is thinking...")+'</div>';
    window.tcAskAi(aiQ,aiL).then(function(t){
     var o2=$("tcVoAiOut"); if(!o2) return;
     o2.innerHTML='<div style="background:#f4f0ff;border:1px solid #d9cdfb;border-radius:10px;padding:10px;font-size:15px;line-height:1.5;white-space:pre-line"><div style="font-size:12px;font-weight:800;color:#4b2fa8;margin-bottom:3px">&#10024; AI</div>'+E(t)+'</div>'+
      '<div style="font-size:11px;color:#777;margin-top:3px">'+E(aiL==="ml"?"AI-യുടെ ഉത്തരത്തിൽ തെറ്റ് വരാം. ആപ്പിലെ ബട്ടണുകൾ നോക്കി ഉറപ്പാക്കുക.":"AI answers can be wrong - check with the buttons in the app.")+'</div>';
    },function(e){ var o2=$("tcVoAiOut"); if(o2) o2.innerHTML='<div style="background:#f6f6f6;border-radius:10px;padding:9px;font-size:13.5px;color:#555">'+E((e&&e.msg)||"")+'</div>'; });
   };
   var ab=$("tcVoAiGo"); if(ab) ab.onclick=askAi;
   if(r.miss) askAi();
  }
  var y=$("tcVoYes"), n=$("tcVoNo"), sy=$("tcVoSay");
  if(y) y.onclick=function(){
   var ok=false; try{ ok=pending&&pending.save(); }catch(e){ ok=false; }
   say(ok?tr("Saved","സേവ് ചെയ്തു"):tr("Could not save on this phone","ഈ ഫോണിൽ സേവ് ചെയ്യാൻ പറ്റില്ല"));
   try{ var u=shopUi(); if(ok&&u&&shopOpen()) u.render(); }catch(e){}
   closeSheet();
  };
  if(n) n.onclick=function(){ pending=null; out.innerHTML=""; };
  if(sy) sy.onclick=function(){ speak(msg); };
  var gb=$("tcVoHelpGo"); if(gb) gb.onclick=function(){ var f=r.go; closeSheet(); try{ f(); }catch(e){} };
  var db2=$("tcVoDemoGo"); if(db2) db2.onclick=function(){ var st=r.demo; closeSheet(); try{ window.tcVoDemo(st,QL); }catch(e){} };
 }

 /* ---------- start ---------- */
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ makeFab(); setFab(); }catch(e){} },200); }
 function start(){
  makeFab();
  document.addEventListener("focusin",later); document.addEventListener("focusout",later);
  if(window.MutationObserver&&document.body) new MutationObserver(later).observe(document.body,{childList:true,subtree:true});
  setInterval(function(){ try{ setFab(); }catch(e){} },3000);
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
