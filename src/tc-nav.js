/* tc-nav.js - exact navigation / phone Back button behaviour.
   PROBLEM (screen recording 2026-10-20): every "Back to Dashboard" or tab press
   to the Dashboard used to ADD a new history entry (history.pushState), and closing a
   pop-up (closeModal) left a duplicate entry too. So the phone Back button replayed the
   whole visit history (Accounts -> Dashboard -> Billing -> Dashboard -> Accounts ...).
   RULE NOW (nothing else changes - no screen is redrawn differently):
     * Dashboard is the only "home". Every other page sits ONE step above it.
     * Back (phone button, "Back to Dashboard" button, swipe, Dashboard tab) from ANY page
       -> Dashboard. Back from the Dashboard -> leaves the app.
     * Moving between pages (tabs / swipe / menu) never adds history steps.
     * A pop-up (modal) is closed by Back first; closing it with its own buttons leaves no
       extra step behind.
   core.js is NOT edited: this file wraps view(), modal(), closeModal(), render(), history.pushState and
   history.replaceState, and adds a popstate listener (it runs AFTER core.js's own listener, so
   render() is muted for the Back steps that are done on purpose).
   Page history entries carry d = how many steps lie between the entry and the Dashboard entry. */
(function(){
 if(window.__tcNav) return;
 var origView=window.view, origModal=window.modal;
 if(typeof origView!=="function"||typeof origModal!=="function"||typeof render!=="function") return;
 window.__tcNav=1;
 var origPush=history.pushState.bind(history), origRep=history.replaceState.bind(history);
 var stale=false, staleTimer=null, swallow=false, swallowTimer=null, expectLand=false, expectTimer=null, savedFM=false;
 var origRender=window.render, mute=false, muteTimer=null;
 function setMute(){ mute=true; clearTimeout(muteTimer); muteTimer=setTimeout(function(){ mute=false; },1500); }
 function clrMute(){ mute=false; clearTimeout(muteTimer); }
 var topState=history.state;

 function hashOf(u){ try{ return new URL(u,location.href).hash.replace(/^#/,""); }catch(e){ return ""; } }
 function isBaseHash(u){ var h=hashOf(u); return h===""||h==="dashboard"; }
 function eff(st,url){
  if(st&&st.tcModal) return {k:"modal",d:0};
  if(st&&st.tcPage) return {k:"page",d:st.d>0?st.d:0};
  if(st&&st.tcBase) return {k:"base",d:0};
  return isBaseHash(url)?{k:"base",d:0}:{k:"page",d:0};
 }
 /* the entry underneath an open (or just-closed, still lingering) pop-up */
 function below(){
  return (tcModalHistoryPushed||stale)?eff(tcPreModalState,tcPreModalUrl):eff(history.state,location.href);
 }
 function baseUrl(){ return location.pathname+location.search+"#dashboard"; }

 history.pushState=function(st,t,u){
  if(st&&st.tcPage&&st.d===undefined){
   var c=below();
   st=Object.assign({},st,{d:c.k==="base"?1:(c.k==="page"&&c.d>0?c.d+1:0)});
  }
  if(stale&&st&&(st.tcPage||st.tcBase)){
   /* a pop-up was just closed: reuse its leftover entry instead of stacking a new one */
   stale=false; clearTimeout(staleTimer);
   return history.replaceState(st,t,u);
  }
  var r=origPush(st,t,u); topState=history.state; return r;
 };
 history.replaceState=function(st,t,u){
  if(st&&st.tcPage&&st.d===undefined){
   var cs=history.state;
   st=Object.assign({},st,{d:(cs&&cs.tcPage&&cs.d>0)?cs.d:0});
  }
  var r=origRep(st,t,u); topState=history.state; return r;
 };

 /* ---- pop-ups ---- */
 window.modal=function(html){
  if(stale){ stale=false; clearTimeout(staleTimer); tcModalHistoryPushed=true; } /* reuse the leftover entry */
  return origModal.apply(this,arguments);
 };
 window.closeModal=function(){
  var m=document.querySelector("#modal"); if(m) m.classList.add("hidden");
  if(tcModalHistoryPushed){
   tcModalHistoryPushed=false; stale=true;
   clearTimeout(staleTimer); staleTimer=setTimeout(cleanStale,150);
  }
 };
 /* nobody used the leftover pop-up entry (no page change, no new pop-up) -> remove it quietly */
 function cleanStale(){
  if(!stale) return;
  stale=false; swallow=true; savedFM=tcCurrentIsFromMenu; setMute();
  clearTimeout(swallowTimer); swallowTimer=setTimeout(function(){ swallow=false; },1500);
  history.back();
 }

 /* ---- going to the Dashboard ---- */
 function goBase(){
  var b=below(), extra=(tcModalHistoryPushed||stale)?1:0, steps;
  if(b.k==="base") steps=extra;
  else if(b.k==="page"&&b.d>0) steps=extra+b.d;
  else return false;
  clearTimeout(staleTimer); stale=false; tcModalHistoryPushed=false;
  var m=document.querySelector("#modal"); if(m) m.classList.add("hidden");
  tcCurrentIsFromMenu=false; tcMenuNavPending=false;
  if(steps===0){ render(); tcUpdateActiveTab(); return true; }
  /* show the Dashboard right now, then drop the page entries (popstate lands on the Dashboard entry) */
  history.replaceState({tcBase:true},"",baseUrl());
  render(); tcUpdateActiveTab();
  expectLand=true; setMute(); clearTimeout(expectTimer);
  expectTimer=setTimeout(function(){ expectLand=false; },1500);
  history.go(-steps);
  return true;
 }
 window.view=function(v){
  var user=null; try{ user=getCurrentUser(); }catch(e){}
  var base=(user&&user.role==="customer")?"":"dashboard";
  if(v===base||v===""){ if(goBase()) return; }
  else if(stale){
   /* same page refreshed right after a pop-up closed: no new step at all */
   var b=below();
   if(b.k==="page"&&hashOf(tcPreModalUrl)===v){
    tcCurrentIsFromMenu=tcMenuNavPending; tcMenuNavPending=false;
    render(); tcUpdateActiveTab(); return;
   }
  }
  return origView.apply(this,arguments);
 };

 /* ---- phone Back button ---- */
 /* Back from a page that still has an old page entry below it (can only happen when a pop-up was
    closed and a different page opened in the same moment) must land on the Dashboard directly */
 function ghostPop(){
  var cs=history.state;
  return !tcModalHistoryPushed&&topState&&topState.tcPage&&topState.d>=2&&cs&&cs.tcPage&&cs.d>0&&cs.d===topState.d-1;
 }
 window.render=function(){
  if(mute||ghostPop()) return;
  return origRender.apply(this,arguments);
 };
 window.addEventListener("popstate",function(){
  var prev=topState, ghost=ghostPop(); topState=history.state;
  if(swallow){ swallow=false; clrMute(); tcCurrentIsFromMenu=savedFM; return; }
  if(expectLand){ expectLand=false; clrMute(); clearTimeout(expectTimer); return; }
  if(ghost){
   tcCurrentIsFromMenu=!!(prev&&prev.fromMenu);
   history.go(-history.state.d);
  }
 });

 /* ---- tidy start-up ---- */
 try{
  var st=history.state;
  if(st&&st.tcModal){
   /* page was reloaded while a pop-up entry existed: remove that leftover entry */
   tcPreModalState=isBaseHash(location.href)?{tcBase:true}:{tcPage:true,d:0};
   tcPreModalUrl=location.href;
   stale=true; staleTimer=setTimeout(cleanStale,400);
  }else if(st==null&&(location.hash===""||location.hash==="#")&&localStorage.getItem("tc_user")){
   origRep({tcBase:true},"",baseUrl()); topState=history.state;
  }
 }catch(e){}
})();
