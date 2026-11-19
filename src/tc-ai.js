/* THE IN-APP AI on the phone (tc-ai.js, loaded by tc-regdocs.js after tc-vohelp.js and before tc-voice.js).
   Owner 2026-11-19: "an AI inside the app that understands Malayalam and English and knows every feature".
   The voice sheet (tc-voice.js) first answers from the app's own help (tc-vohelp.js - offline, free). When the help has no answer it asks
   the AI by itself; under any other help answer there is a small "Ask AI" button.
     window.tcAskAi(question, lang) -> Promise "answer text"  (rejects {error, msg})
   Sent to /api/ai: the question, the language, the kind of business on screen and the closest app-help notes (tcVoHelpTop).
   NEVER the accounts, bills, customers or figures of this phone. The server keeps the AI free: daily limits + a 7-day answer cache. */
(function(){
 if(window.__tcAi) return;
 window.__tcAi=1;
 function me(){ try{ return String((getCurrentUser()||{}).mobile||""); }catch(e){ return ""; } }
 function dev(){ try{ return typeof getDeviceToken==="function"?getDeviceToken():(localStorage.getItem("tc_device_token")||""); }catch(e){ return ""; } }
 var memo={}, stop="", hist=[];   /* hist: the last 2 questions + answers of this sheet, so a follow-up ("and if it is a drop?") is understood */
 window.tcAskAiReset=function(){ hist=[]; };
 function why(er,ml){
  var M={
   user_limit:["ഇന്നത്തെ AI ചോദ്യങ്ങളുടെ എണ്ണം കഴിഞ്ഞു - നാളെ വീണ്ടും ചോദിക്കാം.","You have used today's AI questions - ask again tomorrow."],
   day_limit:["ഇന്ന് AI-യുടെ സൗജന്യ പരിധി കഴിഞ്ഞു - നാളെ വീണ്ടും ശ്രമിക്കൂ.","Today's free AI limit is used up - try again tomorrow."],
   offline:["ഇന്റർനെറ്റ് ഇല്ല - AI-യോട് ചോദിക്കാൻ ഇന്റർനെറ്റ് വേണം.","No internet - the AI needs internet."],
   unauthorized:["AI ഉപയോഗിക്കാൻ ലോഗിൻ ചെയ്യണം.","Please log in to use the AI."],
   no_ai:["AI ഇപ്പോൾ ലഭ്യമല്ല.","The AI is not available now."]
  };
  var m=M[er]||["AI-ൽ നിന്ന് ഇപ്പോൾ ഉത്തരം കിട്ടിയില്ല - കുറച്ചു കഴിഞ്ഞ് ശ്രമിക്കൂ.","The AI could not answer now - try again a little later."];
  return ml?m[0]:m[1];
 }
 window.tcAskAiWhy=why;
 window.tcAskAi=function(q,lang){
  q=String(q||"").replace(/\s+/g," ").trim().slice(0,500);
  var ml=lang!=="en";
  if(q.length<3) return Promise.reject({error:"too_short",msg:ml?"ചോദ്യം കുറച്ചുകൂടി വിശദമായി ചോദിക്കൂ.":"Please ask a little more."});
  if(!me()) return Promise.reject({error:"unauthorized",msg:why("unauthorized",ml)});
  if(stop) return Promise.reject({error:stop,msg:why(stop,ml)});
  var notes=[]; try{ notes=typeof window.tcVoHelpTop==="function"?window.tcVoHelpTop(q,4):[]; }catch(e){ notes=[]; }
  var biz=""; try{ biz=typeof window.tcVoHelpBiz==="function"?window.tcVoHelpBiz():""; }catch(e){ biz=""; }
  var k=(ml?"ml|":"en|")+biz+"|"+q.toLowerCase(); if(memo[k]) return Promise.resolve(memo[k]);   /* the same question again in this session: no new call */
  var ctl=(typeof AbortController==="function")?new AbortController():null, tm=ctl?setTimeout(function(){ try{ ctl.abort(); }catch(e){} },35000):0;
  return fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},signal:ctl?ctl.signal:undefined,
    body:JSON.stringify({mobile:me(),device_token:dev(),q:q,lang:ml?"ml":"en",biz:biz,notes:notes,history:hist.slice(-2)})})
   .then(function(r){ clearTimeout(tm); return r.json().catch(function(){ return {ok:false,error:"bad_answer"}; }); },function(){ clearTimeout(tm); return {ok:false,error:"offline"}; })
   .then(function(j){
    if(!j||!j.ok||!j.text){ var er=(j&&j.error)||"error"; if(er==="user_limit"||er==="day_limit"||er==="no_ai") stop=er; throw {error:er,msg:why(er,ml)}; }
    var t=String(j.text).replace(/\*\*/g,"").trim(); memo[k]=t; hist.push({q:q,a:t}); hist=hist.slice(-2); return t;
   });
 };
})();
