/* ADMIN TEST PAGES (tc-demo.js, loaded by tc-regdocs.js after tc-shopplan.js).
   Owner 2026-11-13: he can only see his own Taxi / Travel business and his own shop, but wants to try every kind of business page (workshop, aquarium shop, other shops,
   skilled workers) and see how it works - like the admin's customer-page preview.
   WHERE: Menu > Admin (password) > "Preview pages" > "Test pages for each business type".  Only the app owner sees it (tc-menu.js).
   WHAT IT DOES: you pick a business type and a plan, and the REAL pages of that type open on a separate DUMMY book with sample items, purchases, sales and (workshop)
   vehicle jobs. A small red "TEST" button stays on the screen: change the plan (Free year just started / last 30 days / year over = view only / Premium),
   start the sample again, or leave the test.
   SAFE: the dummy book has its own key on the phone ("tc_shop_v1:demo-<type>"), is never sent to the server and never touches the real book (tc-shop.js setDemo);
   while a test is open the business type and the plan seen by the shop pages are replaced, and everything is put back when the test is left.
   Covered types: Workshop / spare parts, Aquarium / pet shop, Other shop, Skilled work (quotation / invoice / bill). The Taxi / Travel pages and the directory belong to
   core.js / directory.js and are not copied here. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||!SH.setDemo||window.__tcDemo) return;
 window.__tcDemo=1;
 var T=UI.T, E=UI.E, H=SH.H;
 var TYPES=[
  ["workshop","Workshop / spare parts","വർക്ക്ഷോപ്പ് / സ്പെയർ പാർട്സ്","workshop"],
  ["aquarium","Aquarium / pet shop","അക്വേറിയം / പെറ്റ് ഷോപ്പ്","shop"],
  ["general","Other shop (grocery, stationery ...)","മറ്റ് ഷോപ്പ് (പലചരക്ക്, സ്റ്റേഷനറി ...)","shop"],
  ["skilled","Skilled work (quotation / bill)","സ്കിൽഡ് വർക്ക് (ക്വട്ടേഷൻ / ബിൽ)","skilled_work"]
 ];
 var PLANS=[
  ["trial365","Free year just started (365 days left)","ഫ്രീ വർഷം തുടങ്ങി (365 ദിവസം ബാക്കി)"],
  ["trial20","Free year, last 20 days (amber note)","ഫ്രീ വർഷം, അവസാന 20 ദിവസം (മഞ്ഞ അറിയിപ്പ്)"],
  ["locked","Year over, no Premium (view only)","വർഷം കഴിഞ്ഞു, പ്രീമിയം ഇല്ല (കാണാൻ മാത്രം)"],
  ["prem","Premium","പ്രീമിയം"]
 ];
 var cur=null;          /* {type, plan, biz0, prem0} while a test page is open */
 function typeRow(k){ for(var i=0;i<TYPES.length;i++) if(TYPES[i][0]===k) return TYPES[i]; return TYPES[0]; }

 /* ---------- sample data (only when the dummy book is empty) ---------- */
 function seed(type){
  if(type==="skilled") return;
  if(SH.products({all:true}).length) return;
  var t=H.today(), d1=H.addDays(t,-1), d2=H.addDays(t,-2), d9=H.addDays(t,-9), P={};
  SH.setCfg("kind",type);
  function item(key,n,ty,c,price,qty,cost){ var p=SH.newProduct({n:n,t:ty,c:c,pr:price}); P[key]=p.id; if(qty) SH.add("b",{p:p.id,q:qty,rt:cost,tr:0},d2); }
  function sale(key,q,price,d){ SH.add("s",{p:P[key],q:q,pr:price,pm:"C",g:H.uid()},d); }
  if(type==="aquarium"){
   item("g","Guppy","f","Fish",40,50,20); item("n","Neon Tetra","f","Fish",60,40,30); item("f","Fish food 100g","i","Fish Food",120,20,80);
   item("fl","Filter 3W","i","Filters",450,6,300); item("tk","Tank 2 ft","i","Tank",1500,4,1000);
   sale("g",6,40,t); sale("f",2,120,t); sale("n",4,60,d1); sale("fl",1,450,d1); sale("tk",1,1500,d1);
   SH.add("m",{p:P.g,q:3,r:"Died"},d1);
  }else if(type==="general"){
   item("r","Rice 1 kg","i","Grocery",60,40,48); item("b","Biscuit pack","i","Food",20,60,14); item("nb","Notebook","i","Stationery",45,30,30); item("tl","Torch","i","Electronics",250,5,170);
   sale("r",5,60,t); sale("b",8,20,t); sale("nb",3,45,d1); sale("tl",1,250,d1);
  }else{
   item("bp","Brake pad (set)","i","Brake",650,10,420); item("eo","Engine oil 1 L","i","Oil & Lubricants",420,24,310); item("of","Oil filter","i","Filters",180,15,110);
   item("bt","Battery 12 V","i","Battery",4200,3,3400); item("af","Air filter","i","Filters",260,8,170);
   sale("eo",2,420,d1);
   var api=window.__tcWorkshopApi;
   if(api&&api.recOf){
    var j1=api.recOf({vn:"KL 18 AB 1234",vm:"Maruti Alto",on:"Ravi",om:"9446000001",km:42100,st:"out",din:d9,dout:H.addDays(t,-8),
     P:[[P.bp,"Brake pad (set)",1,650],[P.of,"Oil filter",1,180]],LB:[["Brake work",300],["Service",250]],nsd:H.addDays(t,20),nsk:47000,nt:"Sample job"});
    SH.add("o",j1,j1.din);
    var j2=api.recOf({vn:"KL 56 C 7788",vm:"Bajaj auto",on:"Suresh",om:"9446000002",km:18800,st:"in",din:t,
     P:[[P.eo,"Engine oil 1 L",1,420],[P.of,"Oil filter",1,180]],LB:[["Oil change",150]],cm:"Engine noise"});
    SH.add("o",j2,j2.din);
    var j3=api.recOf({vn:"KL 18 AB 1234",vm:"Maruti Alto",on:"Ravi",om:"9446000001",km:35200,st:"out",din:H.addDays(t,-120),dout:H.addDays(t,-119),
     P:[[P.af,"Air filter",1,260]],LB:[["Service",300]]});
    SH.add("o",j3,j3.din);
   }
  }
 }

 /* ---------- the plan chosen for the test ---------- */
 function applyPlan(p){
  cur.plan=p;
  var P=window.__tcShopPlan; if(!P||!P.setDemo) return;
  if(p==="trial365") P.setDemo("trial",365); else if(p==="trial20") P.setDemo("trial",20); else if(p==="locked") P.setDemo("locked"); else P.setDemo("prem");
 }

 /* ---------- start / leave ---------- */
 function start(type,plan,wipe){
  if(cur) leave(true);
  var row=typeRow(type);
  cur={type:type,plan:plan||"trial365",biz0:window.__tcBizOnScreen,prem0:window.tcIsPremiumPlan};
  window.__tcBizOnScreen=function(){ return row[3]; };
  window.tcIsPremiumPlan=function(){ return !!cur&&cur.plan==="prem"; };
  SH.setDemo("demo-"+type,!!wipe);
  var P=window.__tcShopPlan; if(P&&P.setDemo) P.setDemo("prem");   /* the sample is made with everything open */
  try{ seed(type); }catch(e){ if(window.console) console.error("tc-demo seed",e); }
  applyPlan(plan||"trial365");
  pill();
  if(type==="skilled"){ if(typeof tcDocsOpen==="function") tcDocsOpen("list"); }
  else if(typeof tsOpen==="function") tsOpen("home");
 }
 function closeLayers(){
  try{ if(window.__tcDocs&&window.__tcDocs.isOpen&&window.__tcDocs.isOpen()) window.__tcDocs.close(); }catch(e){}
  try{ if(UI.isOpen&&UI.isOpen()){ UI.go("home"); if(typeof tsBack==="function") tsBack(); } }catch(e){}
 }
 function leave(quiet){
  if(!cur) return;
  closeLayers();
  var c=cur; cur=null;
  window.__tcBizOnScreen=c.biz0; window.tcIsPremiumPlan=c.prem0;
  var P=window.__tcShopPlan; if(P&&P.setDemo) P.setDemo(null);
  SH.setDemo("");
  var o=document.getElementById("tcDemoPill"); if(o) o.remove();
  var q=document.getElementById("tcDemoPanel"); if(q) q.remove();
  if(!quiet){ try{ toast(T("ടെസ്റ്റ് അവസാനിപ്പിച്ചു","Test closed")); }catch(e){} }
 }
 window.tcDemoStart=start; window.tcDemoLeave=function(){ leave(false); };
 window.tcDemoState=function(){ return cur; };

 /* ---------- the small red TEST button and its panel ---------- */
 function pill(){
  if(document.getElementById("tcDemoPill")) return;
  var b=document.createElement("div"); b.id="tcDemoPill";
  b.style.cssText="position:fixed;right:8px;bottom:84px;z-index:100002;background:#c0392b;color:#fff;font-weight:800;font-size:13px;padding:8px 12px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.4);cursor:pointer";
  b.textContent="🧪 TEST";
  b.onclick=function(){ window.tcDemoPanel(); };
  document.body.appendChild(b);
 }
 window.tcDemoPanel=function(){
  if(!cur) return;
  var q=document.getElementById("tcDemoPanel"); if(q){ q.remove(); return; }
  q=document.createElement("div"); q.id="tcDemoPanel";
  q.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100003;display:flex;align-items:center;justify-content:center;padding:18px";
  var row=typeRow(cur.type);
  q.innerHTML='<div style="background:#fff;border-radius:14px;padding:14px;max-width:380px;width:100%;box-sizing:border-box;font-size:15px;line-height:1.4">'+
   '<div style="font-size:17px;font-weight:800;color:#c0392b">🧪 '+E(T("ടെസ്റ്റ് മോഡ്","Test mode"))+'</div>'+
   '<div style="margin:4px 0 8px">'+E(T(row[2],row[1]))+'<br><span style="color:#555;font-size:13px">'+E(T("ഇത് ഡമ്മി ബുക്ക് ആണ്. ഒന്നും നിങ്ങളുടെ യഥാർത്ഥ കണക്കിലോ സെർവറിലോ പോകില്ല.","This is a dummy book. Nothing goes to your real books or the server."))+'</span></div>'+
   '<label style="display:block;font-size:13px;color:#555">'+E(T("പ്ലാൻ","Plan"))+'<select id="tcDemoPlanSel" style="width:100%;padding:8px;font-size:15px;margin-top:2px" onchange="tcDemoPlan(this.value)">'+
   PLANS.map(function(p){ return '<option value="'+p[0]+'"'+(p[0]===cur.plan?" selected":"")+'>'+E(T(p[2],p[1]))+'</option>'; }).join("")+'</select></label>'+
   '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'+
   '<button style="flex:1;padding:10px" onclick="tcDemoReset()">'+E(T("സാമ്പിൾ വീണ്ടും തുടങ്ങുക","Start the sample again"))+'</button>'+
   '<button style="flex:1;padding:10px;background:#c0392b;color:#fff;border:0" onclick="tcDemoLeave()">'+E(T("ടെസ്റ്റ് അവസാനിപ്പിക്കുക","Leave the test"))+'</button></div>'+
   '<button style="margin-top:8px;width:100%;padding:10px" onclick="document.getElementById(\'tcDemoPanel\').remove()">'+E(T("തുടരുക","Continue"))+'</button></div>';
  document.body.appendChild(q);
 };
 window.tcDemoPlan=function(p){ if(cur) applyPlan(p); };
 window.tcDemoReset=function(){
  if(!cur) return;
  var c=cur, type=c.type, plan=c.plan;
  var q=document.getElementById("tcDemoPanel"); if(q) q.remove();
  closeLayers();
  SH.setDemo("demo-"+type,true);
  var P=window.__tcShopPlan; if(P&&P.setDemo) P.setDemo("prem");
  try{ seed(type); }catch(e){}
  applyPlan(plan);
  setTimeout(function(){ if(!cur) return; if(type==="skilled"){ if(typeof tcDocsOpen==="function") tcDocsOpen("list"); } else if(typeof tsOpen==="function") tsOpen("home"); },450);
 };

 /* ---------- the picker (Menu > Admin > Preview pages) ---------- */
 function picker(){
  var last=""; try{ last=localStorage.getItem("tc_demo_last")||""; }catch(e){}
  var lt=last.split("|");
  modal('<h2>🧪 '+E(T("ഓരോ ബിസിനസ് തരത്തിന്റെയും ടെസ്റ്റ് പേജ്","Test pages for each business type"))+'</h2>'+
   '<p class="muted" style="font-size:12.5px">'+E(T("യഥാർത്ഥ പേജുകൾ തന്നെ ഡമ്മി ഡാറ്റയോടെ തുറക്കും. നിങ്ങളുടെ യഥാർത്ഥ കണക്കുകൾ തൊടില്ല, സെർവറിലേക്ക് ഒന്നും പോകില്ല. ടാക്സി / ട്രാവൽ പേജുകൾ ഇതിൽ ഇല്ല.","The real pages open with dummy data. Your real books are not touched and nothing is sent to the server. Taxi / Travel pages are not part of this."))+'</p>'+
   '<label>'+E(T("ബിസിനസ് തരം","Business type"))+'<select id="tcDemoType">'+TYPES.map(function(r){ return '<option value="'+r[0]+'"'+(r[0]===lt[0]?" selected":"")+'>'+E(T(r[2],r[1]))+'</option>'; }).join("")+'</select></label>'+
   '<label>'+E(T("പ്ലാൻ","Plan"))+'<select id="tcDemoPlanPick">'+PLANS.map(function(p){ return '<option value="'+p[0]+'"'+(p[0]===lt[1]?" selected":"")+'>'+E(T(p[2],p[1]))+'</option>'; }).join("")+'</select></label>'+
   '<div class="actions"><button class="primary" onclick="tcDemoGo()">'+E(T("ടെസ്റ്റ് പേജ് തുറക്കുക","Open the test page"))+'</button></div>'+
   '<p class="muted" style="font-size:12px">'+E(T("പ്ലാൻ പിന്നീട് ചുവന്ന TEST ബട്ടണിൽ നിന്ന് മാറ്റാം.","You can change the plan later with the red TEST button."))+'</p>');
 }
 window.tcDemoGo=function(){
  var t=document.getElementById("tcDemoType"), p=document.getElementById("tcDemoPlanPick"); if(!t||!p) return;
  try{ localStorage.setItem("tc_demo_last",t.value+"|"+p.value); }catch(e){}
  try{ closeModal(); }catch(e){}
  setTimeout(function(){ start(t.value,p.value,false); },450);
 };
 window.tcPreviewBizTypes=function(){
  if(typeof requireAdmin==="function") requireAdmin(picker); else picker();
 };
})();
