/* App help for the voice / type box (tc-vohelp.js, loaded by tc-regdocs.js BEFORE tc-voice.js).
   Owner 2026-11-17 (screenshot): asked "CA report എങ്ങനെയാണ് ഇതിനകത്ത് നിന്ന് എടുക്കുക" and the box said "did not understand".
   Every "how / where do I ..." question about the app itself must get a clear answer, on every business page (shop, taxi / travel,
   auto, skilled work ...), and where possible an "Open" button that goes straight there.
   window.tcVoHelp(text) -> null, or {kind:"help", ml, en, go?:function, intent:bool}
     - topics below: keywords (Malayalam, English, spoken forms), which businesses they are for, the steps in both languages,
       and the function that opens the place (only offered when that function exists on this phone).
     - intent = the words ask HOW / WHERE (എങ്ങനെ, എവിടെ, how to, where ...; "how much / how many" is a question about figures, not help). tc-voice.js answers such questions first, for every plan
       (help is not a Platinum feature); a command like "500 രൂപ ഡീസൽ ചെലവ്" has no such word and still goes to the command.
     - nothing found but the words ask how / where: a short list of questions that can be asked here.
   Only text - nothing is saved or sent anywhere. */
(function(){
 if(window.__tcVoHelp) return;
 window.__tcVoHelp=1;
 function fn(n){ return typeof window[n]==="function"; }
 function biz(){ try{ return window.__tcBizOnScreen?String(window.__tcBizOnScreen()||""):""; }catch(e){ return ""; } }
 function shopOn(){   /* the shop book is open on screen (its layer stays in the page when closed, so ask the shop UI) */
  try{ var u=window.__tcShopUi; if(u&&typeof u.isOpen==="function"&&u.isOpen()) return true; }catch(e){}
  var b=biz(); return !!b&&!/taxi|travel|auto|pickup|cab|vehicle/.test(b);   /* every non-vehicle business uses the shop book */
 }
 function travelOn(){ return /taxi|travel|auto|cab|tempo|bus|vehicle/.test(biz()); }
 function norm(t){ return " "+String(t||"").toLowerCase().replace(/[.,!?;:"'()\[\]]/g," ").replace(/\s+/g," ").trim()+" "; }
 function V(name){ return fn("view")?function(){ try{ if(fn("closeModal")) window.closeModal(); }catch(e){} window.view(name); }:null; }   /* a taxi page by its bottom-tab name */
 function inShop(f){ return function(){ if(!document.getElementById("tcShop")&&fn("tsOpen")) window.tsOpen("home"); setTimeout(f,60); }; }
 var INTENT=["എങ്ങനെ","എങ്ങിനെ","എവിടെ","എവിടന്ന്","എവിടുന്ന്","എവിടെനിന്ന്","എടുക്കാൻ","എടുക്കുക","എടുക്കും","ചെയ്യാൻ","ചെയ്യും","ചെയ്യുക","ചേർക്കാൻ","ചേർക്കും","മാറ്റാൻ","തിരുത്താൻ","കാണാൻ","ഉണ്ടാക്കാൻ","ഉണ്ടാക്കും","കിട്ടും","കിട്ടാൻ","അയക്കാൻ","പ്രിന്റ്","ഡൗൺലോഡ്","തുറക്കാൻ","സഹായം",
  " how to"," how do"," how can"," how should"," how will"," how i ","where ","help","open ","find ","get the","make a","print","download","demo","show me","teach","ഡെമോ","പഠിപ്പിക്ക","കാണിച്ചു തര","കാണിച്ചുതര","കാണാൻ","തുറക്കാൻ",
  /* Malayalam written in English letters (Manglish) */
  " engane"," enghane"," engineya"," evide"," evidunnu"," evidenn"," edukkan"," edukkum"," cheyyan"," cheyyum"," cheyyendath"," cherkkan"," kaanan"," thurakkan"];
 /* ---------- language tools: spelling / voice-typing mistakes and Manglish ----------
    A word is turned into its sound skeleton (consonant groups, vowels dropped) - the same for Malayalam and English letters:
    "കണക്ക്" = "kanakku" = "kanaku" -> KNK;  "ബാക്കപ്പ്" = "backup" = "bakup" -> PKP;  "ക്വട്ടേഷൻ" = "quotation" = "kotation" -> KTN.
    A keyword also matches when the skeletons match (a little lower score than an exact match). */
 var MLS={"ക":"K","ഖ":"K","ഗ":"K","ഘ":"K","ങ":"N","ച":"S","ഛ":"S","ജ":"S","ഝ":"S","ഞ":"N","ട":"T","ഠ":"T","ഡ":"T","ഢ":"T","ണ":"N","ത":"T","ഥ":"T","ദ":"T","ധ":"T","ന":"N",
  "പ":"P","ഫ":"P","ബ":"P","ഭ":"P","മ":"M","ര":"R","റ":"R","ല":"L","ള":"L","ഴ":"L","വ":"V","ശ":"S","ഷ":"S","സ":"S","ഹ":"","ൻ":"N","ൺ":"N","ർ":"R","ൽ":"L","ൾ":"L","ൿ":"K"};
 var LAS={b:"P",p:"P",f:"P",c:"K",k:"K",g:"K",q:"K",d:"T",t:"T",j:"S",s:"S",z:"S",v:"V",w:"V",m:"M",n:"N",r:"R",l:"L",h:""};
 function skel(w){
  w=String(w||"").toLowerCase().replace(/ക്വ/g,"ക").replace(/റ്റ/g,"ട").replace(/ന്റ/g,"ണ്ട").replace(/ൻ്?റ/g,"ണ്ട").replace(/ph/g,"f").replace(/th/g,"t").replace(/sh/g,"s").replace(/ch/g,"s").replace(/zh/g,"l").replace(/x/g,"ks").replace(/qu/g,"k").replace(/tion/g,"shan");
  var o="", last="";
  for(var i=0;i<w.length;i++){ var c=w[i], k=MLS[c]!=null?MLS[c]:(LAS[c]!=null?LAS[c]:""); if(k&&k!==last) o+=k; if(k) last=k; else if(/[aeiouy\u0d3e-\u0d4c\u0d05-\u0d14]/.test(c)) last=""; }
  return o;
 }
 window.tcVoHelpSkel=skel;
 var MANG=[" engane"," evide"," enthu"," entha"," ethra"," undo"," alle"," aano"," aanu"," cheyy"," kanakk"," kittan"," koduth"," pokan"," nokk"," enikk"," ente "," innu"," innale"," masam"," maasam"," varav"," chelav"," labham"," vandi"," kada "," kuri"," chitty"," kalyan"];
 /* reply in the language of the question: Malayalam letters or Manglish -> Malayalam, else English */
 window.tcVoLangOf=function(raw){
  var t=String(raw||"");
  if(/[\u0d00-\u0d7f]/.test(t)) return "ml";
  var s=" "+t.toLowerCase().replace(/[^a-z0-9 ]+/g," ")+" ";
  if(MANG.some(function(w){ return s.indexOf(w)>=0; })) return "ml";
  return /[a-z]/.test(s)?"en":"";
 };
 /* topics: k = keywords, b = for which businesses ('shop' shop book, 'travel' taxi / travel, 'docs' shop + skilled work, 'all'), ml / en = steps, go = opens it */
 var T=[
  {k:["ca pack","ca report","ca റിപ്പോർട്ട്","ca പാക്ക്","സി എ","സിഎ","സി.എ","സിആർ","സി ആർ","ഓഡിറ്റർ","auditor","accountant","അക്കൗണ്ടന്റ്","ചാർട്ടേഡ്"],b:"shop",
   ml:"CA പാക്ക് (ഒരു മാസത്തെ GST, ലാഭ-നഷ്ടം, കടം - ഒറ്റ Excel ഫയൽ):\n1. ഷോപ്പ് കണക്ക് തുറന്ന് \"ഇന്നത്തെ കണക്ക്\" അമർത്തുക.\n2. മുകളിൽ \"മാസം\" അമർത്തി ◀ ▶ കൊണ്ട് മാസം തിരഞ്ഞെടുക്കുക.\n3. ഏറ്റവും താഴെ \"CA പാക്ക്\" അമർത്തുക - ഫയൽ ഡൗൺലോഡ്സിൽ വരും, അത് CA-ക്ക് WhatsApp / ഇമെയിൽ ചെയ്യാം.\nശ്രദ്ധിക്കുക: ഇത് Platinum പ്ലാനിലാണ്. ഷോപ്പ് ഹോമിൽ \"ലാഭം മറയ്ക്കുക\" ഓണാണെങ്കിൽ ബട്ടൺ കാണില്ല - \"ലാഭം കാണിക്കുക\" അമർത്തുക.",
   en:"CA pack (one month's GST, profit-loss and dues in one Excel file):\n1. Open the shop accounts and tap \"Today's account\".\n2. Tap \"Month\" at the top and pick the month with ◀ ▶.\n3. Tap \"CA pack\" at the bottom - the file goes to Downloads; send it to your CA by WhatsApp / e-mail.\nNote: Platinum plan. If \"Hide profit\" is on (shop home), tap \"Show profit\" first.",
   demo:function(){ if(!fn("tsOpen")) return null; return [{open:inShop(function(){ window.tsOpen("report"); setTimeout(function(){ if(fn("tsRpMode")) window.tsRpMode("month"); },80); }),sel:"[onclick*='tsRpMode']",ml:"മുകളിൽ \"മാസം\" തിരഞ്ഞെടുക്കുക; ◀ ▶ കൊണ്ട് മാസം മാറ്റാം.",en:"Choose \"Month\" at the top; change the month with ◀ ▶."},
    {sel:"[onclick*='tcCaPack']",ml:"ഈ \"CA പാക്ക്\" ബട്ടൺ തൊട്ടാൽ ആ മാസത്തെ Excel ഫയൽ കിട്ടും (Platinum).",en:"Tap this \"CA pack\" button to get that month's Excel file (Platinum)."}]; },
   go:function(){ if(!fn("tsOpen")) return null; return inShop(function(){ window.tsOpen("report"); setTimeout(function(){ if(fn("tsRpMode")) window.tsRpMode("month"); },80); }); }},
  {k:["ca pack","ca report","ca റിപ്പോർട്ട്","ca പാക്ക്","സി എ","സിഎ","സിആർ","സി ആർ","gst report","ജിഎസ്ടി റിപ്പോർട്ട്","gst റിപ്പോർട്ട്","ഓഡിറ്റർ","auditor","accountant"],b:"travel",
   ml:"GST റിപ്പോർട്ടും CA പാക്കും (ടാക്സി / ട്രാവൽ):\n1. ഡാഷ്ബോർഡിലെ \"ബില്ലിംഗ് വിവരങ്ങൾ\" കാർഡിൽ \"GST report\" അമർത്തുക (GSTIN അല്ലെങ്കിൽ GST % ചേർത്താലേ ബട്ടൺ വരൂ - \"Edit\" വഴി ചേർക്കാം).\n2. മാസം തിരഞ്ഞെടുക്കുക.\n3. \"CA pack (Excel)\" അമർത്തിയാൽ ഫയൽ ഡൗൺലോഡ്സിൽ വരും. CA പാക്ക് Platinum പ്ലാനിലാണ്.",
   en:"GST report and CA pack (taxi / travel):\n1. On the Dashboard, in the \"Billing details\" card, tap \"GST report\" (shown once a GSTIN or GST % is added - use Edit there).\n2. Pick the month.\n3. Tap \"CA pack (Excel)\" - the file goes to Downloads. The CA pack is a Platinum feature.",
   go:function(){ return fn("tcGstReport")?function(){ window.tcGstReport(); }:null; }},
  {k:["excel","എക്സൽ","full book","മുഴുവൻ കണക്ക്","export","എക്സ്പോർട്ട്"],b:"shop",
   ml:"മുഴുവൻ കണക്കും Excel ആയി: ഷോപ്പ് കണക്ക് › \"ഇന്നത്തെ കണക്ക്\" › താഴെ \"Excel (എല്ലാ കണക്കും)\".",
   en:"The whole book as Excel: shop accounts › \"Today's account\" › \"Excel (the whole book)\" at the bottom.",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("report"); }):null; }},
  {k:["gst","ജിഎസ്ടി","tax","ടാക്സ്"],b:"shop",
   ml:"ഷോപ്പിലെ GST: ഷോപ്പ് ഹോം › \"സെറ്റിങ്സ്\" ൽ GST ഓൺ ചെയ്യുക; ഓരോ സാധനത്തിനും GST % \"സ്റ്റോക്ക്\" › സാധനം › \"പേരും വിവരങ്ങളും തിരുത്തുക\" ൽ. മാസത്തെ GST \"ഇന്നത്തെ കണക്ക്\" › \"മാസം\" ൽ കാണാം; CA-ക്ക് \"CA പാക്ക്\".",
   en:"GST in the shop: shop home › \"Settings\" to switch GST on; each item's GST % in \"Stock\" › item › \"Edit name and details\". The month's GST is in \"Today's account\" › \"Month\"; for the CA use \"CA pack\".",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("settings"); }):null; }},
  {k:["വിൽപ്പന","വിൽക്കാൻ","sale","sell","ബിൽ അടിക്ക","bill adik"],b:"shop",
   ml:"വിൽപ്പന: ഷോപ്പ് ഹോം › \"വിൽപ്പന\" › സാധനം തിരഞ്ഞ് എണ്ണം നൽകുക › പണം കൊടുത്ത രീതി (ക്യാഷ് / UPI / കാർഡ് / കടം / \"Split\") › \"സേവ്\". ബിൽ വേണമെങ്കിൽ \"സേവ് + ബിൽ\".",
   en:"A sale: shop home › \"Sale\" › search the item, enter the count › how it was paid (cash / UPI / card / credit / \"Split\") › \"Save\". For a bill tap \"Save + bill\".",
   demo:function(){ if(!fn("tsOpen")) return null; return [{open:inShop(function(){ window.tsOpen("sale"); }),sel:"#tsBody input[id^='pk_']",ml:"1. സാധനത്തിന്റെ പേരിന്റെ ആദ്യ അക്ഷരങ്ങൾ ഇവിടെ ടൈപ്പ് ചെയ്ത് ലിസ്റ്റിൽ നിന്ന് തിരഞ്ഞെടുക്കുക.",en:"1. Type the first letters of the item name here and pick it from the list."},
    {sel:"[onclick*='tsSaAdd(']",later:["സാധനം തിരഞ്ഞെടുത്താൽ ഈ ബട്ടൺ വരും","this button appears after you pick an item"],ml:"2. വിലയും എണ്ണവും നോക്കി \"ചേർക്കുക\" തൊട്ടാൽ സാധനം കാർട്ടിൽ വരും. കൂടുതൽ സാധനങ്ങളും ഇങ്ങനെ ചേർക്കാം.",en:"2. Check price and quantity and tap \"Add\" - the item goes into the cart. Add more items the same way."},
    {sel:"[onclick='tsSaSave()']",later:["കാർട്ടിൽ സാധനം ചേർത്താൽ ഈ ബട്ടൺ വരും","this button appears once an item is in the cart"],ml:"3. പണമടച്ച രീതി (ക്യാഷ് / UPI / കാർഡ് / കടം) തിരഞ്ഞെടുത്ത് ഇത് തൊട്ട് സേവ് ചെയ്യുക.",en:"3. Choose how it was paid (cash / UPI / card / credit) and tap this to save."},
    {sel:"[onclick='tsSaSave(1)']",later:["കാർട്ടിൽ സാധനം ചേർത്താൽ ഈ ബട്ടൺ വരും","this button appears once an item is in the cart"],ml:"4. കസ്റ്റമർക്ക് ബില്ല് വേണമെങ്കിൽ ഇത് - സേവ് ചെയ്ത് ബില്ല് (പ്രിന്റ് / PDF / WhatsApp).",en:"4. If the customer wants a bill, use this - save and bill (print / PDF / WhatsApp)."}]; },
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("sale"); }):null; }},
  {k:["ബിൽ","bill","പ്രിന്റ്","print","റീപ്രിന്റ്","reprint","വീണ്ടും","pdf","പിഡിഎഫ്","whatsapp","വാട്സ്ആപ്പ്"],b:"shop",
   ml:"വിൽപ്പനയുടെ ബിൽ: വിൽപ്പന സേവ് ചെയ്യുമ്പോൾ \"സേവ് + ബിൽ\" അമർത്തുക - പ്രിന്റ്, PDF, ചിത്രം, WhatsApp. പഴയ ബിൽ വീണ്ടും: \"വിൽപ്പന\" സ്ക്രീനിലെ ലിസ്റ്റിലോ \"ഇന്നത്തെ കണക്ക്\" ലെ ഓരോ വിൽപ്പനയിലോ ഉള്ള ബിൽ ബട്ടൺ.",
   en:"A sale's bill: when saving the sale tap \"Save + bill\" - print, PDF, image, WhatsApp. An old bill again: the bill button on the sale in the \"Sale\" list or in \"Today's account\".",
   demo:function(){ if(!fn("tsOpen")) return null; return [{open:inShop(function(){ window.tsOpen("sale"); }),sel:"[onclick*='tsBillSheet']",ml:"ഇന്നത്തെ വിൽപ്പനകളുടെ നേരെയുള്ള ഈ ബിൽ ബട്ടൺ തൊട്ടാൽ ബില്ല് വീണ്ടും പ്രിന്റ് / PDF / WhatsApp ചെയ്യാം.",en:"The bill button next to each of today's sales prints / makes a PDF / sends on WhatsApp again."}]; },
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("report"); }):null; }},
  {k:["split","സ്പ്ലിറ്റ്","cash and upi","ക്യാഷും upi","പകുതി"],b:"shop",
   ml:"ക്യാഷ് + UPI ഒരുമിച്ച്: \"വിൽപ്പന\" സ്ക്രീനിൽ പണം കൊടുത്ത രീതിയുടെ നിരയിൽ \"Split (cash + UPI...)\" അമർത്തി ഓരോന്നിന്റെയും തുക നൽകുക.",
   en:"Cash + UPI together: on the \"Sale\" screen, in the payment row tap \"Split (cash + UPI...)\" and enter each amount.",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("sale"); }):null; }},
  {k:["വാങ്ങൽ","purchase","പുതിയ സാധനം","new item","add item","സാധനം ചേർക്ക","stock ചേർക്ക","സ്റ്റോക്ക് ചേർക്ക"],b:"shop",
   ml:"പുതിയ സാധനം / വാങ്ങിയ സ്റ്റോക്ക്: ഷോപ്പ് ഹോം › \"വാങ്ങൽ\" › സാധനത്തിന്റെ പേര്, എണ്ണം, വാങ്ങിയ വില, വിൽക്കുന്ന വില › സേവ്. ഒരുപാട് സാധനങ്ങൾ ഒന്നിച്ച്: ഹോമിന് താഴെ \"Excel-ൽ നിന്ന് ചേർക്കുക\".",
   en:"A new item / bought stock: shop home › \"Purchase\" › item name, count, cost and selling price › Save. Many items at once: \"Import from Excel\" at the bottom of the shop home.",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("purchase"); }):null; }},
  {k:["പേര്+മാറ്റ","പേര്+തിരുത്ത","പേര്+ശരിയാക്ക","വില+മാറ്റ","name+change","change+name","item+name","price+change","category+change","unit+change","യൂണിറ്റ്+മാറ്റ","കാറ്റഗറി+മാറ്റ","പേര് മാറ്റ","പേര് തിരുത്ത","rename","edit item","edit name","spelling","സ്പെല്ലിങ്","വില മാറ്റ","price change","കാറ്റഗറി","category","യൂണിറ്റ്","unit"],b:"shop",
   ml:"സാധനത്തിന്റെ പേര്, വില, കാറ്റഗറി, യൂണിറ്റ് മാറ്റാൻ: \"സ്റ്റോക്ക്\" › സാധനം അമർത്തുക › \"പേരും വിവരങ്ങളും തിരുത്തുക\". (വിൽപ്പന സ്ക്രീനിൽ തിരയുമ്പോൾ പേരിനടുത്തുള്ള പെൻസിലും അതേ സ്ഥലത്തേക്ക് പോകും.)",
   en:"Change an item's name, price, category or unit: \"Stock\" › tap the item › \"Edit name and details\". (The pencil next to an item in the Sale search goes to the same place.)",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("stock"); }):null; }},
  {k:["ഒന്നാക്ക","merge","ഡ്യൂപ്ലിക്കേറ്റ്","duplicate","രണ്ട് പേരിൽ","two names"],b:"shop",
   ml:"ഒരേ സാധനം രണ്ട് പേരിൽ: \"സ്റ്റോക്ക്\" › അതിൽ ഒന്ന് അമർത്തുക › \"പേരും വിവരങ്ങളും തിരുത്തുക\" › \"ഇതേ ഇനം വേറെ പേരിൽ ഉണ്ട് - ഒന്നാക്കുക\" › മറ്റേ പേര് തിരഞ്ഞെടുക്കുക. സ്റ്റോക്ക് ഇരട്ടിക്കാതിരിക്കാനുള്ള ചോദ്യം അവിടെ വരും.",
   en:"The same item under two names: \"Stock\" › tap one › \"Edit name and details\" › \"Same item under another name - merge\" › pick the other name. It asks how to keep the stock right so it is not doubled.",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("stock"); }):null; }},
  {k:["സ്റ്റോക്ക്","stock","തീരാറായി","low stock","എത്ര ബാക്കി"],b:"shop",
   ml:"സ്റ്റോക്ക്: ഷോപ്പ് ഹോം › \"സ്റ്റോക്ക്\". തീരാറായവ ഹോമിലെ \"സാധനങ്ങൾ തീരാറായി\" അമർത്തിയാൽ കാണാം. ഒരു സാധനത്തിന്റെ സ്റ്റോക്ക് ചോദിക്കാൻ: \"Alpha സ്റ്റോക്ക് എത്ര\".",
   en:"Stock: shop home › \"Stock\". Items running low: tap \"items running low\" on the home. Ask one item: \"how much Alpha stock\".",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("stock"); }):null; }},
  {k:["ചത്ത","നഷ്ടം","കേടായ","dead","loss","damage","expired"],b:"shop",
   ml:"ചത്തതോ കേടായതോ ആയ സാധനം: ഷോപ്പ് ഹോമിലെ ചുവന്ന ടൈൽ (നഷ്ടം) › സാധനവും എണ്ണവും › സേവ്. സ്റ്റോക്കിൽ നിന്ന് കുറയും, ലാഭത്തിൽ നഷ്ടമായി വരും.",
   en:"Dead or damaged goods: the loss tile on the shop home › item and count › Save. It comes off the stock and counts as a loss.",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("dead"); }):null; }},
  {k:["ചെലവ്","expense","വാടക","rent","കറന്റ് ബിൽ","current bill","ശമ്പളം ചേർക്ക"],b:"shop",
   ml:"കടയുടെ ചെലവ്: ഷോപ്പ് ഹോം › \"ചെലവ്\" › ഇനം, തുക › സേവ്. വോയിസിൽ: \"ഇന്ന് 500 രൂപ കറന്റ് ബിൽ ചെലവ്\".",
   en:"A shop expense: shop home › \"Expenses\" › kind, amount › Save. By voice: \"500 rupees current bill expense today\".",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("expense"); }):null; }},
  {k:["കടം","credit","dues","കിട്ടാനുള്ള","തരാനുള്ള","ബാക്കി പണം","supplier"],b:"shop",
   ml:"കടം / കിട്ടാനുള്ളത്: ഷോപ്പ് ഹോം › \"കടം / കിട്ടാനുള്ളത്\" - ആര് എത്ര തരാനുണ്ട്, പണം കിട്ടുമ്പോൾ അവിടെ ചേർക്കാം. ചോദിക്കാൻ: \"ആരൊക്കെ പണം തരാനുണ്ട്\".",
   en:"Credit & dues: shop home › \"Credit & dues\" - who owes how much; add a payment there when it comes. Ask: \"who owes me money\".",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("dues"); }):null; }},
  {k:["സ്റ്റാഫ്","staff","ജോലിക്കാര","കമ്മീഷൻ","commission","ശമ്പളം","salary","wage"],b:"shop",
   ml:"സ്റ്റാഫ് ഫോണുകൾ: ഷോപ്പ് ഹോമിന് താഴെ \"സ്റ്റാഫ് ഫോണുകൾ\" (Premium: 2, Platinum: 10 വരെ). ശമ്പളം / വിൽപ്പനയുടെ % കമ്മീഷൻ: \"സെറ്റിങ്സ്\" ൽ ഓരോ സ്റ്റാഫിനും. കമ്മീഷൻ GST ഇല്ലാത്ത തുകയിലാണ്.",
   en:"Staff phones: \"Staff phones\" at the bottom of the shop home (Premium: 2, Platinum: up to 10). Salary / % commission: in \"Settings\" for each staff member. Commission is on the amount without GST.",
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("staff"); }):null; }},
  {k:["ലാഭം മറയ്ക്ക","hide profit","ലാഭം കാണിക്ക","show profit"],b:"shop",
   ml:"ലാഭം മറയ്ക്കാൻ / കാണിക്കാൻ: ഷോപ്പ് ഹോമിന് താഴെ \"ലാഭം മറയ്ക്കുക\" / \"ലാഭം കാണിക്കുക\".",
   en:"Hide / show profit: \"Hide profit\" / \"Show profit\" at the bottom of the shop home.",
   go:function(){ return fn("tsOpen")?function(){ window.tsOpen("home"); }:null; }},
  {k:["ക്വട്ടേഷൻ","quotation","ഇൻവോയ്സ്","invoice","വാറന്റി","warranty","എസ്റ്റിമേറ്റ്","estimate"],b:"docs",
   ml:"ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബിൽ: മെനു › \"ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബിൽ\" › പുതിയത്. ക്വട്ടേഷൻ പിന്നീട് ഇൻവോയ്സ് ആക്കാം; PDF, പ്രിന്റ്, WhatsApp ബട്ടണുകൾ അതിലുണ്ട്.",
   en:"Quotation / invoice / bill: Menu › \"Quotation / Invoice / Bill\" › new. A quotation can later become an invoice; PDF, print and WhatsApp buttons are inside.",
   go:function(){ return fn("tcDocsOpen")?function(){ window.tcDocsOpen("list"); }:null; }},
  {k:["ക്വട്ടേഷൻ","quotation","എസ്റ്റിമേറ്റ്","estimate","കൊട്ടേഷൻ"],b:"travel",
   ml:"ടാക്സി ക്വട്ടേഷൻ:\n1. താഴെ \"Quotations\" ടാബ് (അല്ലെങ്കിൽ ഡാഷ്ബോർഡിലെ \"New Quotation\").\n2. പതിവ് ടൂറാണെങ്കിൽ മുകളിലെ \"Packages\" ബോക്സിൽ നിന്ന് എടുക്കാം.\n3. കസ്റ്റമറുടെ പേര്, മൊബൈൽ, ട്രിപ്പ് ടൈപ്പ്, വാഹന വിഭാഗം, സ്ഥലങ്ങൾ, KM / മണിക്കൂർ / ദിവസം ചേർക്കുക.\n4. \"Calculate\" - തുക കാണാം; \"Print\" / \"PDF\" / \"Image\" കൊണ്ട് കസ്റ്റമർക്ക് അയക്കാം.\n5. \"Save Quotation\". ട്രിപ്പ് ഉറപ്പായാൽ താഴെ ലിസ്റ്റിൽ \"Confirm & Create Trip\".",
   en:"Taxi quotation:\n1. The \"Quotations\" tab at the bottom (or \"New Quotation\" on the Dashboard).\n2. For a regular tour, pick it from the \"Packages\" box at the top.\n3. Fill customer name, mobile, trip type, vehicle category, places, KM / hours / days.\n4. \"Calculate\" shows the amount; send it with \"Print\" / \"PDF\" / \"Image\".\n5. \"Save Quotation\". When the trip is confirmed: \"Confirm & Create Trip\" in the list below.",
   demo:function(){ return fn("view")?[{open:V("quotations"),sel:"#tcPkgBox",later:["സേവ് ചെയ്ത പാക്കേജ് ഉണ്ടെങ്കിൽ ഇവിടെ കാണും","saved packages show here"],ml:"1. പതിവ് ടൂറാണെങ്കിൽ ഈ \"Packages\" ബോക്സിൽ നിന്ന് എടുത്ത് \"Use\" തൊടുക (ഇല്ലെങ്കിൽ വിടുക).",en:"1. For a regular tour pick it in this \"Packages\" box and tap \"Use\" (or skip)."},
    {sel:"#qName",ml:"2. കസ്റ്റമറുടെ പേരും മൊബൈലും ഇവിടെ.",en:"2. The customer's name and mobile here."},
    {sel:"#qCat",ml:"3. വാഹന വിഭാഗം തിരഞ്ഞെടുക്കുക (ട്രിപ്പ് ടൈപ്പും ഇതിനടുത്ത്).",en:"3. Choose the vehicle category (the trip type is next to it)."},
    {sel:"#qDest",ml:"4. പോകേണ്ട സ്ഥലങ്ങൾ; താഴെ KM, മണിക്കൂർ, ദിവസം.",en:"4. The places to go; KM, hours and days below."},
    {sel:"[onclick='calcQuote()']",ml:"5. \"Calculate\" - തുക കാണാം. അടുത്തുള്ള Print / PDF / Image കൊണ്ട് കസ്റ്റമർക്ക് അയക്കാം.",en:"5. \"Calculate\" shows the amount. Print / PDF / Image next to it send it to the customer."},
    {sel:"[onclick='saveQuote()']",ml:"6. \"Save Quotation\" - സേവ് ചെയ്യുക. ട്രിപ്പ് ഉറപ്പായാൽ താഴെ ലിസ്റ്റിൽ \"Confirm & Create Trip\".",en:"6. \"Save Quotation\". When confirmed, \"Confirm & Create Trip\" in the list below."}]:null; },
   go:function(){ return V("quotations"); }},
  {k:["ലൈവ് ട്രിപ്പ്","live trip","ട്രിപ്പ് തുടങ്ങ","start trip","new trip","സ്റ്റോപ്പ്","stop","ട്രിപ്പ് അവസാനിപ്പി","end trip"],b:"travel",
   ml:"ലൈവ് ട്രിപ്പ്: ഡാഷ്ബോർഡ് › \"Live Trip Log\" › \"Start New Trip\" (കസ്റ്റമർ, വണ്ടി, തുടക്ക KM). ഓരോ സ്ഥലത്തും \"എന്താണ്\" തിരഞ്ഞെടുത്ത് സ്ഥലവും KM-ഉം ചേർക്കുക. അവസാനം \"End Trip\", പിന്നെ \"Create Bill\" - ബിൽ തനിയെ നിറയും.",
   en:"Live trip: Dashboard › \"Live Trip Log\" › \"Start New Trip\" (customer, vehicle, start KM). At each place pick \"What happened\", add place and KM. At the end \"End Trip\", then \"Create Bill\" - the bill fills itself.",
   demo:function(){ return fn("view")?[{open:V("dashboard"),sel:"[onclick='tcLtStartForm()']",later:["ഡാഷ്ബോർഡിലെ Live Trip Log കാർഡിൽ ഈ ബട്ടൺ ഉണ്ട്","this button is on the Live Trip Log card of the Dashboard"],ml:"ട്രിപ്പ് തുടങ്ങുമ്പോൾ ഈ ബട്ടൺ തൊടുക: കസ്റ്റമർ, വണ്ടി, തുടക്ക KM ചേർക്കുക. ഓരോ സ്ഥലത്തും സ്റ്റോപ്പ് ചേർക്കുക; അവസാനം \"End Trip\", പിന്നെ \"Create Bill\".",en:"Tap this when the trip starts: customer, vehicle, start KM. Add a stop at each place; at the end \"End Trip\", then \"Create Bill\"."}]:null; },
   go:function(){ return fn("tcLtStartForm")?function(){ window.tcLtStartForm(); }:null; }},
  {k:["കിലോമീറ്റർ","km","മാപ്പ്","map","റോഡ്","road","ദൂരം","distance"],b:"travel",
   ml:"മാപ്പിൽ നിന്ന് റോഡ് KM (Premium): ലൈവ് ട്രിപ്പിൽ സ്റ്റോപ്പ് ചേർക്കുമ്പോൾ സ്ഥലം ടൈപ്പ് ചെയ്താൽ \"Road km\" വരി വരും - \"Fill KM\" അമർത്തിയാൽ KM നിറയും. ട്രിപ്പ് മുഴുവൻ: ബില്ലിൽ \"KM from the map\". KM തെറ്റിയാൽ സേവ് ചെയ്യുമ്പോൾ ആപ്പ് ഓർമ്മിപ്പിക്കും.",
   en:"Road KM from the map (Premium): in a live trip, typing the place of a stop shows a \"Road km\" line - \"Fill KM\" puts it in. The whole trip: \"KM from the map\" in the bill. A KM that looks wrong is pointed out when saving.",
   go:null},
  {k:["ടോൾ","toll","പാർക്കിംഗ്","parking","ബാറ്റ","bata","പെർമിറ്റ്","permit"],b:"travel",
   ml:"ടോൾ, പാർക്കിംഗ്, ഡ്രൈവർ ഭക്ഷണം / താമസം, പെർമിറ്റ്: ട്രിപ്പ് നടക്കുമ്പോൾ ലൈവ് ട്രിപ്പ് തുറന്ന് ആ ചിപ്പ് അമർത്തി തുക ചേർക്കുക. ബിൽ ഉണ്ടാക്കുമ്പോൾ തനിയെ വരും.",
   en:"Toll, parking, driver food / stay, permit: during the trip open the live trip, tap the chip and add the amount. It comes into the bill by itself.",
   go:null},
  {k:["trip & accounts","trip and accounts","ട്രിപ്പ് കണക്ക്","വണ്ടിയുടെ കണക്ക്","വരവ് ചെലവ്","ഡീസൽ ചെലവ്"],b:"travel",
   ml:"വണ്ടി തിരിച്ചുള്ള വരവ്-ചെലവ് പുസ്തകം: മെനു › \"Trip & Accounts\". ബില്ലുകൾ തനിയെ വരും; ചെലവ് അവിടെയോ വോയിസിലോ (\"500 രൂപ ഡീസൽ ചെലവ്\").",
   en:"Vehicle-wise income and expense book: Menu › \"Trip & Accounts\". Bills come in by themselves; add expenses there or by voice (\"500 rupees diesel expense\").",
   demo:function(){ return fn("view")?[{open:V("accounts"),sel:"[onclick=\"tcAbAdd('in')\"]",later:["Trip & Accounts ആദ്യം തുടങ്ങണം","start Trip & Accounts first"],ml:"1. പണം കിട്ടിയാൽ \"+ Income\" (ബില്ലിലെ പണം തനിയെ വരും).",en:"1. Money received: \"+ Income\" (bill payments come in by themselves)."},
    {sel:"[onclick=\"tcAbAdd('out')\"]",ml:"2. ചെലവിന് \"- Expense\" - ഡീസൽ, ടോൾ, സർവീസ്... വാഹനം തിരഞ്ഞെടുക്കാൻ മറക്കരുത്.",en:"2. Spending: \"- Expense\" - diesel, toll, service ... choose the vehicle."},
    {sel:"[onclick=\"tcAbSet('tab','day')\"]",ml:"3. \"Day Book\" - ഓരോ ദിവസത്തെ ബാലൻസ്; \"Vehicle Book\" - വാഹനം തിരിച്ച്.",en:"3. \"Day Book\" - each day's balance; \"Vehicle Book\" - per vehicle."},
    {sel:"#abMore",ml:"4. \"More\" - ടിപ്പ്, ഡ്രൈവർമാർ, ലാഭ റിപ്പോർട്ട്, Excel, CSV, Import.",en:"4. \"More\" - tips, drivers, profit report, Excel, CSV, Import."}]:null; },
   go:function(){ return fn("view")?function(){ window.view("accounts"); }:null; }},
  {k:["rate master","റേറ്റ്","rate","നിരക്ക്","കിലോമീറ്റർ നിരക്ക്"],b:"travel",
   ml:"വണ്ടിയുടെ നിരക്കുകൾ (km നിരക്ക്, മിനിമം, ബാറ്റ): മെനു › \"Rate Master\".",
   en:"Vehicle rates (per km, minimum, bata): Menu › \"Rate Master\".",
   go:function(){ return fn("view")?function(){ window.view("master"); }:null; }},
  {k:["വണ്ടി ചേർക്ക","add vehicle","പുതിയ വണ്ടി","vehicle"],b:"travel",
   ml:"വണ്ടി ചേർക്കാൻ: ഡാഷ്ബോർഡ് › \"Add vehicle\". വണ്ടിയുടെ ഇൻഷുറൻസ്, പെർമിറ്റ് തീയതികൾ വണ്ടിയുടെ വിവരങ്ങളിൽ.",
   en:"Add a vehicle: Dashboard › \"Add vehicle\". Insurance / permit dates are in the vehicle's details.",
   go:null},
  {k:["ബുക്കിംഗ്","booking","ഫോളോഅപ്പ്","follow up","follow-up","schedule"],b:"travel",
   ml:"ബുക്കിംഗും ഫോളോഅപ്പും: ഡാഷ്ബോർഡിലെ \"Bookings & follow-ups\" കാർഡ് › \"Schedule\".",
   en:"Bookings and follow-ups: the \"Bookings & follow-ups\" card on the Dashboard › \"Schedule\".",
   go:null},
  {k:["എന്റെ പേര് മാത്രം","my name only","travel connect പേര്","ലോഗോ മാറ്റ","own name","own brand"],b:"all",
   ml:"ബില്ലിൽ എന്റെ പേര് മാത്രം (Travel Connect പേര് ഇല്ലാതെ): മെനു › \"Bill: my name only (Platinum)\". പണം അടച്ച Platinum പ്ലാനിൽ മാത്രം; സൗജന്യ കാലയളവിൽ ഇല്ല.",
   en:"Bills with only my name (no Travel Connect name): Menu › \"Bill: my name only (Platinum)\". Only on a paid Platinum plan, not during a free period.",
   go:function(){ return fn("tcBrandOpen")?function(){ window.tcBrandOpen(); }:null; }},
  {k:["my accounts","എന്റെ കണക്ക്","സ്വന്തം കണക്ക്","വ്യക്തിഗത","personal accounts","എന്റെ കണക്കുകൾ"],   /* the parts (covers, chitty, loans, bills) have their own topics below */b:"all",
   ml:"എന്റെ സ്വന്തം കണക്ക് (വരവ്-ചെലവ്, ലോൺ, കല്യാണ കവർ, കുറി / ചിട്ടി, ബിൽ ഓർമ്മപ്പെടുത്തൽ): മെനു › \"My Accounts\". കവർ പേരോ മൊബൈലോ കൊണ്ട് വർഷങ്ങൾക്ക് ശേഷവും തിരയാം.",
   en:"My own accounts (income-expense, loans, ceremony covers, chitty / kuri, bill reminders): Menu › \"My Accounts\". Covers can be searched by name or mobile even years later.",
   go:function(){ return fn("tcPersOpen")?function(){ window.tcPersOpen(); }:null; }},
  {k:["ബാക്കപ്പ്","backup","ഫോൺ മാറ്റ","new phone","പുതിയ ഫോൺ","restore","റീസ്റ്റോർ","ക്ലൗഡ്","cloud"],b:"all",
   ml:"ബാക്കപ്പ്: ഷോപ്പ് കണക്ക് സെർവറിൽ തനിയെ സിങ്ക് ആകും - പുതിയ ഫോണിൽ അതേ നമ്പറിൽ ലോഗിൻ ചെയ്താൽ മതി. ടാക്സി കണക്ക്: മെനു › \"Cloud Backup\" (Premium) അല്ലെങ്കിൽ \"Backup file\". സ്വന്തം കണക്ക്: My Accounts › \"Backup file / export\" - ആ ഫയൽ WhatsApp / Drive / Bluetooth വഴി പുതിയ ഫോണിലേക്ക് അയച്ച് അവിടെ ചേർക്കാം (സൗജന്യം). ക്ലൗഡ് ബാക്കപ്പ് (കസ്റ്റമർമാർക്കും): My Accounts › Backup › \"ക്ലൗഡ് ബാക്കപ്പ്\" - വർഷം ₹99, അല്ലെങ്കിൽ ഫോൺ മാറ്റത്തിന് 30 ദിവസം ₹10. ആദ്യം പാസ്‌വേഡ് ലോക്ക് ഓൺ ചെയ്യണം; പുതിയ ഫോണിൽ \"ക്ലൗഡിൽ നിന്ന് തിരികെ കൊണ്ടുവരിക\" തൊട്ട് പാസ്‌വേഡ് നൽകുക.",
   en:"Backup: the shop accounts sync to the server by themselves - log in with the same number on the new phone. Taxi books: Menu › \"Cloud Backup\" (Premium) or \"Backup file\". My Accounts: \"Backup file / export\" - send the file by WhatsApp / Drive / Bluetooth to the new phone and add it there (free). Cloud backup (customers too): My Accounts › Backup › \"Cloud backup\" - Rs.99 a year, or Rs.10 for 30 days when changing the phone. Turn on the password lock first; on the new phone tap \"Bring back from cloud\" and enter the password.",
   demo:function(){ return fn("tcPersOpen")?[{open:function(){ window.tcPersOpen("backup"); },sel:"#tpPcCard, [onclick*='tpBkFile']",ml:"ബാക്കപ്പ് ഇവിടെ: ക്ലൗഡ് ബാക്കപ്പ് (പാസ്‌വേഡ് ലോക്ക് വേണം) അല്ലെങ്കിൽ സൗജന്യ ബാക്കപ്പ് ഫയൽ (WhatsApp / Drive-ൽ സൂക്ഷിക്കാം). Premium ഓണർമാർക്ക് മെനുവിലെ \"Cloud Backup\" എല്ലാം സൂക്ഷിക്കും.",en:"Backup is here: the cloud backup (needs the password lock) or the free backup file (keep it in WhatsApp / Drive). Premium owners: \"Cloud Backup\" in the Menu keeps everything."}]:null; },
   go:function(){ return fn("tcPersOpen")?function(){ window.tcPersOpen("backup"); }:null; }},
  {k:["പാസ്‌വേഡ്","password","ലോക്ക്","lock","പിൻ","pin","സുരക്ഷ","security","സൈൻ ഔട്ട്","sign out","മറ്റ് ഫോണ്"],b:"all",
   ml:"സുരക്ഷ: മെനു › \"My account security\" - ഏതൊക്കെ ഫോണിൽ ലോഗിൻ ഉണ്ട്, മറ്റ് ഫോണുകൾ സൈൻ ഔട്ട്. My Accounts-ന് വേറെ പാസ്‌വേഡ്: My Accounts › \"Password lock\".",
   en:"Security: Menu › \"My account security\" - which phones are logged in, sign the others out. A separate password for My Accounts: My Accounts › \"Password lock\".",
   go:function(){ return fn("tcAcctSecOpen")?function(){ window.tcAcctSecOpen(); }:null; }},
  {k:["പ്ലാൻ","plan","പ്രീമിയം","premium","പ്ലാറ്റിനം","platinum","അപ്ഗ്രേഡ്","upgrade","പണം അടയ്ക്ക","renew"],b:"all",
   ml:"പ്ലാൻ: ഡാഷ്ബോർഡിലെ പ്ലാൻ വരിയിൽ (Premium / Platinum, കാലാവധി) അപ്ഗ്രേഡ് ബട്ടൺ. Premium ₹999 / വർഷം (ഉടമ + 2 സ്റ്റാഫ്), Platinum ₹2,999 / വർഷം (10 സ്റ്റാഫ് വരെ, CA പാക്ക്, AI ഇൻസൈറ്റ്).",
   en:"Plan: the plan line on the Dashboard (Premium / Platinum, valid until) has the upgrade button. Premium ₹999 / year (owner + 2 staff), Platinum ₹2,999 / year (up to 10 staff, CA pack, AI insights).",
   go:null},
  {k:["ബിസിനസ് മാറ്റ","switch","മറ്റൊരു ബിസിനസ്","another business","രണ്ട് ബിസിനസ്"],b:"all",
   ml:"മറ്റൊരു ബിസിനസ് തുറക്കാൻ: ഡാഷ്ബോർഡ് › \"Switch to another of my businesses\" (മെനുവിലും ഉണ്ട്).",
   en:"Open another of your businesses: Dashboard › \"Switch to another of my businesses\" (also in the Menu).",
   go:null},
  {k:["വിവരങ്ങൾ മാറ്റ","edit business","ബിസിനസ് വിവര","അഡ്രസ്","address","ഫോൺ നമ്പർ മാറ്റ","gstin"],b:"all",
   ml:"ബിസിനസ് വിവരങ്ങൾ (പേര്, അഡ്രസ്, നമ്പർ): ഡാഷ്ബോർഡ് › \"Edit Business Details\". ബില്ലിലെ പേര് / GSTIN: \"ബില്ലിംഗ് വിവരങ്ങൾ\" കാർഡിലെ \"Edit\".",
   en:"Business details (name, address, number): Dashboard › \"Edit Business Details\". Name / GSTIN on bills: \"Edit\" in the \"Billing details\" card.",
   go:null},
  {k:["അപ്ഡേറ്റ്","update","reload","റീലോഡ്","പുതിയ വേർഷൻ","new version"],b:"all",
   ml:"പുതിയ മാറ്റങ്ങൾ കിട്ടാൻ: മെനു › \"Reload App\".",
   en:"To get the latest changes: Menu › \"Reload App\".",
   go:null},
  {k:["ഇൻസൈറ്റ്","insight","ai","എഐ","നിർദ്ദേശം"],b:"all",
   ml:"AI ഇൻസൈറ്റ്: ഷോപ്പ് ഹോമിലും ടാക്സി ഡാഷ്ബോർഡിലും \"ഇൻസൈറ്റ്\" കാർഡ്. ഇവിടെ \"ഇൻസൈറ്റ്\" എന്ന് പറഞ്ഞാലും തുറക്കും. ചോദിക്കാവുന്നവ: \"ഈ മാസം ലാഭം എത്ര\", \"ആരൊക്കെ പണം തരാനുണ്ട്\".",
   en:"AI insights: the \"Insights\" card on the shop home and the taxi Dashboard. Saying \"insights\" here opens them too. Ask: \"profit this month\", \"who owes me money\".",
   go:null},
  /* ---- added 2026-11-18: more of the app, with "Show me" demos where the screen is in this app's own files ---- */
  {k:["quick bill","ക്വിക്ക് ബിൽ","ബില്ല് ഉണ്ടാക്ക","ബിൽ അടിക്ക","bill adikk","ടാക്സി ബിൽ","taxi bill","create bill","make bill"],b:"travel",
   ml:"ക്വിക്ക് ബിൽ (ട്രിപ്പ് കഴിഞ്ഞു, ക്വട്ടേഷൻ ഇല്ലാതെ):\n1. ഡാഷ്ബോർഡിലെ \"Quick Bill\" (അല്ലെങ്കിൽ Billing ടാബ് › \"Create Quick Bill\").\n2. കസ്റ്റമർ, ട്രിപ്പ് ടൈപ്പ്, വാഹന വിഭാഗം, റേറ്റ്, KM, സമയം, ടോൾ / പാർക്കിംഗ് ചേർക്കുക.\n3. \"Create Bill\". പിന്നെ Print / PDF / WhatsApp.\nലൈവ് ട്രിപ്പ് ഉപയോഗിച്ചാൽ ട്രിപ്പ് അവസാനിപ്പിച്ച് \"Create Bill\" തൊട്ടാൽ ഇതെല്ലാം തനിയെ നിറയും.",
   en:"Quick Bill (trip done, no quotation):\n1. \"Quick Bill\" on the Dashboard (or Billing tab › \"Create Quick Bill\").\n2. Fill customer, trip type, vehicle category, rate, KM, time, toll / parking.\n3. \"Create Bill\", then Print / PDF / WhatsApp.\nWith a Live Trip, \"End Trip\" then \"Create Bill\" fills all this by itself.",
   demo:function(){ return fn("goQuickBill")?[{open:function(){ window.goQuickBill(); },sel:"#qbName",ml:"1. കസ്റ്റമറുടെ പേര്; താഴെ ട്രിപ്പ് ടൈപ്പ്, വാഹന വിഭാഗം, റേറ്റ്, KM, സമയം.",en:"1. The customer's name; below: trip type, category, rate, KM, time."},
    {sel:"[onclick='saveQuickBill()']",ml:"2. \"Create Bill\" - ബില്ല് ഉണ്ടാകും; പിന്നെ Print / PDF / WhatsApp.",en:"2. \"Create Bill\" makes the bill; then Print / PDF / WhatsApp."}]:null; },
   go:function(){ return fn("goQuickBill")?function(){ window.goQuickBill(); }:null; }},
  {k:["എൻക്വയറി","enquiry","enquiries","അന്വേഷണം","ബുക്കിംഗ് ആക്ക","care of","കമ്മീഷൻ","commission"],b:"travel",
   ml:"എൻക്വയറി → ബുക്കിംഗ്:\n1. താഴെ \"Enquiries\" ടാബ് തുറക്കുക.\n2. പുതിയ എൻക്വയറി ചേർക്കുക: സമയം, യാത്രക്കാർ, കുറിപ്പ്, ആര് വഴി വന്നു (care-of), അയാൾക്കുള്ള കമ്മീഷൻ.\n3. ഓരോ എൻക്വയറിക്കും Open / Booked / Lost എന്ന് മാർക്ക് ചെയ്യാം; തിരിച്ചു വിളിക്കേണ്ട തീയതിയും വയ്ക്കാം.\n4. Booked ആയവ ഡാഷ്ബോർഡിലെ ബുക്കിംഗ് കാർഡിൽ വരും.",
   en:"Enquiry → booking:\n1. Open the \"Enquiries\" tab at the bottom.\n2. Add an enquiry: time, passengers, note, who sent it (care-of) and his commission.\n3. Mark each one Open / Booked / Lost; you can set a call-back date.\n4. Booked ones show in the bookings card on the Dashboard.",demo:function(){ return fn("view")?[{open:V("enquiries"),sel:"#enqName",ml:"1. വിളിച്ച കസ്റ്റമറുടെ പേര്, മൊബൈൽ, പിക്കപ്പ്, സ്ഥലം, തീയതി ഇവിടെ (കോൾ ചെയ്യുമ്പോൾ തന്നെ മുകളിലെ Quick Fare കൊണ്ട് ചാർജ് പറയാം).",en:"1. The caller's name, mobile, pickup, place and date here (Quick Fare at the top tells the fare during the call)."},
    {sel:"[onclick='saveEnquiry()']",ml:"2. \"Save Enquiry\". പിന്നീട് ലിസ്റ്റിൽ Open / Booked / Lost എന്ന് മാർക്ക് ചെയ്യാം.",en:"2. \"Save Enquiry\". Later mark it Open / Booked / Lost in the list."}]:null; },
   go:function(){ return V("enquiries"); }},
  {k:["ബില്ലിംഗ്","billing","my bills","ബില്ല് തിരുത്ത","edit bill","edit full bill","ബില്ല് മാറ്റ","adjust final","ഫൈനൽ ബിൽ"],b:"travel",
   ml:"ടാക്സി ബില്ലുകൾ: താഴെ \"Billing\" ടാബ് › My Bills. ഒരു ബില്ല് തുറന്നാൽ:\n• \"Edit trip details\" - തീയതി, KM, മണിക്കൂർ, ഡ്രൈവർ, മറ്റ് ചാർജുകൾ.\n• \"Edit full bill\" - കസ്റ്റമർ, ട്രിപ്പ് ടൈപ്പ്, റേറ്റ്, വാഹനം, സ്ഥലങ്ങൾ എല്ലാം.\n• \"Adjust Final Bill Amount\" - അവസാന തുക മാറ്റാൻ.",
   en:"Taxi bills: \"Billing\" tab at the bottom › My Bills. Open a bill:\n• \"Edit trip details\" - dates, KM, hours, driver, other charges.\n• \"Edit full bill\" - customer, trip type, rate, vehicle, places - everything.\n• \"Adjust Final Bill Amount\" - change the final amount.",demo:function(){ return fn("view")?[{open:V("billing"),sel:"#tcBlList input[type=search]",later:["ബില്ലുകൾ ഉണ്ടായാൽ My Bills ഇവിടെ വരും","My Bills shows here once there are bills"],ml:"1. My Bills: കസ്റ്റമറുടെ പേരോ ബിൽ നമ്പറോ ടൈപ്പ് ചെയ്ത് ബില്ല് കണ്ടെത്തുക.",en:"1. My Bills: type the customer name or bill number to find a bill."},
    {sel:"[onclick^='tcBlOpen(']",later:["ബില്ലുകൾ ഉണ്ടായാൽ ഈ ബട്ടൺ വരും","this button appears once there are bills"],ml:"2. \"Open\" - ബില്ല് തുറക്കും. അവിടെ \"Edit trip details\", \"Adjust Final Bill Amount\", \"Edit full bill\" ബട്ടണുകൾ ഉണ്ട്.",en:"2. \"Open\" opens the bill: there are \"Edit trip details\", \"Adjust Final Bill Amount\" and \"Edit full bill\"."},
    {sel:"[onclick^='tcBlRecv(']",later:["ബാക്കിയുള്ള ബില്ലിന് ഈ ബട്ടൺ വരും","shows on a bill with a balance"],ml:"3. പിന്നീട് പണം കിട്ടിയാൽ \"Received\" - തുക, രീതി, തീയതി.",en:"3. Money received later: \"Received\" - amount, mode, date."}]:null; },
   go:function(){ return V("billing"); }},
  {k:["deleted bill","ഡിലീറ്റ് ചെയ്ത ബിൽ","ഡിലീറ്റ് ആയ","തിരികെ കൊണ്ടുവര","bring back","restore bill","undo delete"],b:"travel",
   ml:"ഡിലീറ്റ് ചെയ്ത ബില്ല് തിരികെ കൊണ്ടുവരാൻ: \"Billing\" ടാബ് › My Bills › \"Deleted bills (n)\" › ബില്ലിന് നേരെ \"Bring back\". അവസാനത്തെ 30 എണ്ണം വരെ കിട്ടും.",
   en:"To bring back a deleted bill: \"Billing\" tab › My Bills › \"Deleted bills (n)\" › \"Bring back\" next to the bill. The last 30 are kept.",demo:function(){ return fn("view")?[{open:V("billing"),sel:"#tcRsLink button",later:["ഒരു ബില്ല് ഡിലീറ്റ് ചെയ്താൽ മാത്രമേ ഈ ബട്ടൺ വരൂ","this button shows only after a bill was deleted"],ml:"\"Deleted bills\" തൊട്ട്, ബില്ലിന് നേരെ \"Bring back\".",en:"Tap \"Deleted bills\", then \"Bring back\" next to the bill."}]:null; },
   go:function(){ return V("billing"); }},
  {k:["പാക്കേജ്","package","saved package","ടൂർ പാക്കേജ്"],b:"travel",
   ml:"സേവ് ചെയ്ത പാക്കേജ്: ക്വട്ടേഷൻ ഫോമിന്റെ മുകളിൽ \"Packages\" ബോക്സ്.\n• ഒരു പാക്കേജ് തിരഞ്ഞെടുത്ത് \"Use\" തൊട്ടാൽ ട്രിപ്പ് ടൈപ്പ്, സ്ഥലങ്ങൾ, ദിവസം തിരിച്ചുള്ള പ്ലാൻ, റേറ്റ്, ബാറ്റ എല്ലാം നിറയും (കസ്റ്റമറും തീയതിയും ഒഴികെ).\n• ഇപ്പോഴത്തെ ക്വട്ടേഷൻ \"Save this as a package\" കൊണ്ട് പാക്കേജാക്കാം; \"Manage\" കൊണ്ട് പേര് മാറ്റാം / കളയാം.",
   en:"Saved packages: the \"Packages\" box at the top of the Quotation form.\n• Pick one and tap \"Use\": trip type, places, day-wise plan, rate, bata are filled (not the customer or dates).\n• \"Save this as a package\" keeps the current quotation as a package; \"Manage\" renames / removes.",demo:function(){ return fn("view")?[{open:V("quotations"),sel:"#tcPkgBox",ml:"ഈ ബോക്സ്: പാക്കേജ് തിരഞ്ഞെടുത്ത് \"Use\"; ഇപ്പോഴത്തെ ഫോം \"Save this as a package\"; \"Manage\" - പേര് മാറ്റാൻ / കളയാൻ.",en:"This box: pick a package and \"Use\"; keep the current form with \"Save this as a package\"; \"Manage\" renames / deletes."}]:null; },
   go:function(){ return V("quotations"); }},
  {k:["import","ഇംപോർട്ട്","excel ചേർക്ക","csv ചേർക്ക","പഴയ കണക്ക് ചേർക്ക","google sheet"],b:"travel",
   ml:"പഴയ Excel / CSV കണക്ക് ചേർക്കാൻ: Trip & Accounts › താഴെ \"More\" › \"Import\". ഫയൽ തിരഞ്ഞെടുത്താൽ കോളങ്ങൾ (തീയതി, വരവ്/ചെലവ്, തുക, വാഹനം...) ആപ്പ് തന്നെ കണ്ടെത്തും; വേണമെങ്കിൽ ഓരോ കോളവും മാറ്റാം.",
   en:"To bring in an old Excel / CSV book: Trip & Accounts › \"More\" at the bottom › \"Import\". Pick the file; the app finds the columns (date, income / expense, amount, vehicle ...) and you can change each one.",demo:function(){ return fn("view")?[{open:V("accounts"),sel:"#abMore",later:["Trip & Accounts ആദ്യം തുടങ്ങണം","start Trip & Accounts first"],ml:"Trip & Accounts-ന്റെ താഴെ ഈ \"More\" തുറക്കുക: ടിപ്പ്, ഡ്രൈവർമാർ, ലാഭ റിപ്പോർട്ട്, Excel, CSV, Import.",en:"Open this \"More\" at the bottom of Trip & Accounts: tips, drivers, profit report, Excel, CSV, Import."}]:null; },
   go:function(){ return V("accounts"); }},
  {k:["profit report","ലാഭ റിപ്പോർട്ട്","വാഹനം തിരിച്ചുള്ള ലാഭം","മാസം തിരിച്ച്","vehicle wise","month wise"],b:"travel",
   ml:"ലാഭ റിപ്പോർട്ട്: Trip & Accounts › താഴെ \"More\" › \"Profit report\". വർഷം തിരഞ്ഞെടുക്കുക - വാഹനം തിരിച്ചും മാസം തിരിച്ചും വരവ്, ചെലവ്, ലാഭം, ട്രിപ്പിന് എത്ര ലാഭം. Excel / CSV ആയി എടുക്കാം.",
   en:"Profit report: Trip & Accounts › \"More\" at the bottom › \"Profit report\". Pick the year - income, expense, profit and profit per trip by vehicle and by month. Excel / CSV too.",demo:function(){ return fn("view")?[{open:V("accounts"),sel:"#abMore",later:["Trip & Accounts ആദ്യം തുടങ്ങണം","start Trip & Accounts first"],ml:"Trip & Accounts-ന്റെ താഴെ ഈ \"More\" തുറക്കുക: ടിപ്പ്, ഡ്രൈവർമാർ, ലാഭ റിപ്പോർട്ട്, Excel, CSV, Import.",en:"Open this \"More\" at the bottom of Trip & Accounts: tips, drivers, profit report, Excel, CSV, Import."}]:null; },
   go:function(){ return V("accounts"); }},
  {k:["ടിപ്പ്","tip","ഡ്രൈവർ കണക്ക്","driver account","drivers list","ബാറ്റ കൊടുത്ത"],b:"travel",
   ml:"ഡ്രൈവർ ടിപ്പ് / ഡ്രൈവർമാർ: Trip & Accounts › \"More\" › \"Tip\" അല്ലെങ്കിൽ \"Drivers\". ഡ്രൈവർക്കുള്ള ടിപ്പ് വാഹനത്തിന്റെ വരവിൽ കൂട്ടില്ല.",
   en:"Driver tips / drivers: Trip & Accounts › \"More\" › \"Tip\" or \"Drivers\". A driver's tip is not counted as the vehicle's income.",demo:function(){ return fn("view")?[{open:V("accounts"),sel:"#abMore",later:["Trip & Accounts ആദ്യം തുടങ്ങണം","start Trip & Accounts first"],ml:"Trip & Accounts-ന്റെ താഴെ ഈ \"More\" തുറക്കുക: ടിപ്പ്, ഡ്രൈവർമാർ, ലാഭ റിപ്പോർട്ട്, Excel, CSV, Import.",en:"Open this \"More\" at the bottom of Trip & Accounts: tips, drivers, profit report, Excel, CSV, Import."}]:null; },
   go:function(){ return V("accounts"); }},
  {k:["day book","ഡേ ബുക്ക്","ദിവസ കണക്ക്","vehicle book","വെഹിക്കിൾ ബുക്ക്","opening balance","closing balance","ബാലൻസ്"],b:"travel",
   ml:"Trip & Accounts:\n• \"+ Income\" / \"- Expense\" - വരവും ചെലവും ചേർക്കാൻ (വാഹനം തിരഞ്ഞെടുത്താൽ വാഹനം തിരിച്ചുള്ള കണക്ക് കിട്ടും).\n• \"Day Book\" - ഓരോ ദിവസത്തെ തുടക്ക ബാലൻസ്, വരവ്, ചെലവ്, അവസാന ബാലൻസ്; ഈ മാസത്തെ വരവ്-ചെലവ്-ലാഭം.\n• \"Vehicle Book\" - ഓരോ വാഹനത്തിന്റെയും കണക്ക്.\n• എൻട്രിയിൽ തൊട്ടാൽ തിരുത്താം.",
   en:"Trip & Accounts:\n• \"+ Income\" / \"- Expense\" - add money in and out (choose the vehicle to get vehicle-wise figures).\n• \"Day Book\" - opening balance, in, out and closing balance of each day; this month's income, expense, profit.\n• \"Vehicle Book\" - the book of each vehicle.\n• Tap an entry to edit it.",demo:function(){ return fn("view")?[{open:function(){ V("accounts")(); setTimeout(function(){ if(fn("tcAbSet")) window.tcAbSet("tab","day"); },150); },sel:"#dbDay",later:["Trip & Accounts ആദ്യം തുടങ്ങണം","start Trip & Accounts first"],ml:"1. ◀ ▶ കൊണ്ട് ദിവസം മാറ്റാം; ആ ദിവസത്തെ വരവ്, ചെലവ്, തുടക്ക / അവസാന ബാലൻസ് കാണാം.",en:"1. Change the day with ◀ ▶; see that day's in, out, opening and closing balance."},
    {sel:"[onclick=\"tcAbSet('tab','veh')\"]",ml:"2. \"Vehicle Book\" - ഓരോ വാഹനത്തിന്റെയും കണക്ക്.",en:"2. \"Vehicle Book\" - the book of each vehicle."}]:null; },
   go:function(){ return V("accounts"); }},
  {k:["മൈലേജ്","mileage","ഡീസൽ കണക്ക്","km per litre","കിലോമീറ്റർ ലിറ്റർ","ടാങ്ക് ഫുൾ","tank full","ഓഡോമീറ്റർ","odometer"],b:"travel",
   ml:"മൈലേജ്: ഡീസൽ ചെലവ് ചേർക്കുമ്പോൾ ലിറ്റർ ടൈപ്പ് ചെയ്ത് \"Tank filled full\" ടിക്ക് ചെയ്യുക. രണ്ട് ഫുൾ ടാങ്കുകൾക്കിടയിലെ ട്രിപ്പ് KM വച്ച് ആപ്പ് km/ലിറ്ററും ഒരു km-ന് എത്ര രൂപയും കണക്കാക്കും (ഓഡോമീറ്റർ റീഡിംഗ് ചേർത്താൽ അതാണ് കൂടുതൽ കൃത്യം).",
   en:"Mileage: when you add a diesel expense, type the litres and tick \"Tank filled full\". From the trip KM between two full tanks the app works out km per litre and rupees per km (an odometer reading, when given, is more exact).",go:null},
  {k:["bank details","ബാങ്ക് വിവര","account number","അക്കൗണ്ട് നമ്പർ","ifsc","upi id","യുപിഐ","qr"],b:"all",
   ml:"ബില്ലിൽ ബാങ്ക് / UPI വിവരം: Edit Billing Details തുറന്ന് \"Account holder name\", \"Bank & branch\", \"Account number\", \"IFSC code\", UPI ഐഡി എന്നിവ ചേർക്കുക. ഇവ ബില്ലിൽ കാണിക്കും.",
   en:"Bank / UPI on the bill: open Edit Billing Details and fill \"Account holder name\", \"Bank & branch\", \"Account number\", \"IFSC code\" and the UPI id. They print on the bill.",go:null},
  {k:["drop","ഡ്രോപ്പ്","minimum charge","മിനിമം ചാർജ്","return km","റിട്ടേൺ km","എയർപോർട്ട് ഡ്രോപ്പ്"],b:"travel",
   ml:"ഡ്രോപ്പ് ബില്ല്: Quick Bill-ൽ Rate \"Drop\" എടുക്കുമ്പോൾ മൂന്ന് ബോക്സ് വരും - KM രീതി (\"Drop point KM only\" അല്ലെങ്കിൽ \"Trip KM + Return KM\"), മിനിമം ചാർജ് (ഉദാ: എയർപോർട്ട് ₹2500), ഇതിൽ ഏതാണോ കൂടുതൽ അത് ബില്ലാകും.",
   en:"Drop bill: in Quick Bill with Rate \"Drop\" three boxes appear - KM method (\"Drop point KM only\" or \"Trip KM + Return KM\") and a minimum charge (e.g. airport Rs.2500); the bill never goes below it.",go:function(){ return fn("goQuickBill")?function(){ window.goQuickBill(); }:null; }},
  {k:["my rate master","സ്വന്തം റേറ്റ്","own rate","offer package","special customer","സ്പെഷ്യൽ കസ്റ്റമർ","കുറഞ്ഞ റേറ്റ്"],b:"travel",
   ml:"എന്റെ റേറ്റ് മാസ്റ്റർ (Premium): മെനു › \"My Rate Master\" › \"+ New category\" അല്ലെങ്കിൽ \"Copy from Travel Connect\". ഓരോ കാറ്റഗറിയിലും സ്പെഷ്യൽ കസ്റ്റമർമാർക്ക് \"Offer package\" (ഒരു ദിവസം / പല ദിവസം) വയ്ക്കാം. ക്വട്ടേഷനിലും ബില്ലിലും ഈ റേറ്റ് തിരഞ്ഞെടുക്കാം.",
   en:"My Rate Master (Premium): Menu › \"My Rate Master\" › \"+ New category\" or \"Copy from Travel Connect\". Each category can have an \"Offer package\" for special customers (one-day / multi-day). Choose these rates in quotations and bills.",go:function(){ return fn("tcRmOpen")?function(){ window.tcRmOpen(); }:null; }},
  {k:["find nearby","അടുത്തുള്ള വണ്ടി","nearby vehicle","ടാക്സി വിളിക്ക","local directory","ഡയറക്ടറി","കട കണ്ടെത്ത","workshop കണ്ടെത്ത"],b:"all",
   ml:"അടുത്തുള്ള വാഹനം / സേവനം: ഹോമിൽ \"Find Nearby Vehicle\" തൊട്ടാൽ അടുത്തുള്ള ടാക്സി / ഓട്ടോ കാണാം, നേരിട്ട് വിളിക്കാം. \"Local Directory\" - കടകൾ, വർക്ക്ഷോപ്പുകൾ, തൊഴിലാളികൾ തുടങ്ങിയവ.",
   en:"Nearby vehicle / services: tap \"Find Nearby Vehicle\" on the home page to see taxis / autos near you and call them. \"Local Directory\" - shops, workshops, workers and more.",go:null},
  {k:["sos","എസ്ഒഎസ്","അപകടം","emergency","സഹായം വേണം"],b:"travel",
   ml:"SOS (വാഹനമുള്ള പാർട്ണർമാർക്ക്): മുകളിലെ ചുവന്ന \"SOS\" ബട്ടൺ. വഴിയിൽ പ്രശ്നം വന്നാൽ മറ്റ് പാർട്ണർമാർക്ക് ഉടനെ അറിയിപ്പ് പോകും.",
   en:"SOS (partners with vehicles): the red \"SOS\" button at the top. If something goes wrong on the road, the other partners get an alert at once.",go:null},
  {k:["delete my data","ഡാറ്റ ഡിലീറ്റ്","അക്കൗണ്ട് ഡിലീറ്റ്","delete account","എന്റെ വിവരങ്ങൾ കളയ"],b:"all",
   ml:"നിങ്ങളുടെ വിവരങ്ങൾ ഡിലീറ്റ് ചെയ്യാൻ: ഓണർമാർ - മെനു › \"Request deletion of my data\". കസ്റ്റമർ - ഹോം പേജിന്റെ ഏറ്റവും താഴെയുള്ള ചെറിയ ലിങ്ക്. അഡ്മിൻ പരിശോധിച്ച് ഡിലീറ്റ് ചെയ്യും.",
   en:"To delete your data: owners - Menu › \"Request deletion of my data\". Customers - the small link at the very bottom of the home page. The admin checks and deletes it.",go:null},
  {k:["കവർ","cover","ചടങ്ങ്","കല്യാണം","വിവാഹം","പണപ്പയറ്റ്","വീട്ടുകൂടൽ","gift money","ഗിഫ്റ്റ്"],b:"all",
   ml:"ചടങ്ങ് കവർ (കല്യാണം, വീട്ടുകൂടൽ, പണപ്പയറ്റ്...):\n1. My Accounts › \"ചടങ്ങ് കവർ\".\n2. \"+\" തൊട്ട് കൊടുത്തതോ കിട്ടിയതോ ചേർക്കുക: പേര്, മൊബൈൽ, സ്ഥലം, ചടങ്ങ്, തുക.\n3. മുകളിലെ തിരയൽ ബോക്സിൽ പേരോ നമ്പറോ ടൈപ്പ് ചെയ്താൽ വർഷങ്ങൾക്ക് മുമ്പുള്ളതും കാണാം; ആർക്കൊക്കെ തിരികെ കൊടുക്കാനുണ്ട് എന്നും കാണിക്കും.",
   en:"Ceremony covers (wedding, housewarming ...):\n1. My Accounts › \"Ceremony covers\".\n2. Tap \"+\" and add what you gave or got: name, mobile, place, ceremony, amount.\n3. Type a name or number in the search box at the top to find even old ones; it also shows whom you still have to return a cover to.",
   go:function(){ return fn("tcPersOpen")?function(){ window.tcPersOpen("gifts"); }:null; },
   demo:function(){ return fn("tcPersOpen")?[{open:function(){ window.tcPersOpen("gifts"); },sel:"#tpgQ",ml:"ഇവിടെ പേരോ മൊബൈൽ നമ്പറോ ടൈപ്പ് ചെയ്ത് പഴയ കവർ കണക്ക് തിരയാം.",en:"Type a name or mobile number here to find old covers."},
    {sel:"[onclick*='tpgAdd']",ml:"ഈ ബട്ടൺ കൊണ്ട് കൊടുത്തതോ കിട്ടിയതോ ആയ കവർ ചേർക്കാം.",en:"Use this button to add a cover you gave or received."}]:null; }},
  {k:["ചിട്ടി","കുറി","chitty","chit","kuri","തവണ","instalment","prize"],b:"all",
   ml:"ചിട്ടി / കുറി:\n1. My Accounts › \"ചിട്ടി / കുറി\".\n2. \"+\" തൊട്ട് പുതിയ ചിട്ടി ചേർക്കുക (പേര്, തവണ തുക, എണ്ണം, തുടങ്ങിയ മാസം).\n3. ഓരോ മാസവും \"അടച്ചു\" ചേർക്കുക; കിട്ടിയാൽ \"പ്രൈസ്\" ചേർക്കുക. അടയ്ക്കാൻ ബാക്കിയുള്ള തവണകൾ ഹോമിൽ കാണിക്കും.",
   en:"Chitty / Kuri:\n1. My Accounts › \"Chitty / Kuri\".\n2. Tap \"+\" to add a chitty (name, instalment, number of months, start month).\n3. Add each month's payment; add the prize when you get it. Missed instalments show on the home card.",
   go:function(){ return fn("tcPersOpen")?function(){ window.tcPersOpen("chits"); }:null; },
   demo:function(){ return fn("tcPersOpen")?[{open:function(){ window.tcPersOpen("chits"); },sel:"[onclick*='tpCAdd']",ml:"ഇവിടെ തൊട്ട് പുതിയ ചിട്ടി / കുറി ചേർക്കാം.",en:"Tap here to add a new chitty / kuri."}]:null; }},
  {k:["വീട്ടു കണക്ക്","വീട്ടിലെ കണക്ക്","personal account","വരവ് ചെലവ് എഴുത","daily expense","household"],b:"all",
   ml:"സ്വന്തം / വീട്ടിലെ വരവ്-ചെലവ്: My Accounts › \"വരവ് ചെലവ്\" › \"+\". ഓരോ ദിവസത്തെയും എൻട്രി തീയതിയോടെ; മാസം തിരിച്ചുള്ള ആകെ കാണാം.",
   en:"Personal / household income and expense: My Accounts › \"Income & expense\" › \"+\". Each entry with its date; monthly totals are shown.",
   go:function(){ return fn("tcPersOpen")?function(){ window.tcPersOpen("money"); }:null; }},
  {k:["കടം കൊടുത്ത","കടം വാങ്ങി","loan","ലോൺ","borrow","lend","കടം തിരികെ"],b:"all",
   ml:"കടം (കൊടുത്തതും വാങ്ങിയതും): My Accounts › \"കടം\". ആളെ തിരഞ്ഞെടുത്ത് കൊടുത്തതും തിരികെ കിട്ടിയതും ചേർക്കാം; ബാക്കി ആപ്പ് കണക്കാക്കും.",
   en:"Loans (given and taken): My Accounts › \"Loans\". Pick the person and add what was given and paid back; the app works out the balance.",
   go:function(){ return fn("tcPersOpen")?function(){ window.tcPersOpen("loans"); }:null; }},
  {k:["പാൽ","milk","സ്കൂൾ ഫീസ്","school fee","വാടക","rent","റീചാർജ്","recharge","ഓർമ്മിപ്പിക്ക","reminder","മാസ ബിൽ"],b:"all",
   ml:"മാസ ബില്ലുകളും ഓർമ്മപ്പെടുത്തലും (പാൽ, സ്കൂൾ ഫീസ്, വാടക, റീചാർജ്...): My Accounts › \"ബില്ലുകൾ\" › \"+\". അടയ്ക്കേണ്ട തീയതി വച്ചാൽ ആ ദിവസം ആപ്പ് അറിയിക്കും.",
   en:"Monthly bills and reminders (milk, school fee, rent, recharge ...): My Accounts › \"Bills\" › \"+\". Set the due day and the app reminds you on that day.",go:null},
  {k:["combo","കോമ്പോ","made of","ചേർത്ത് വിൽക്ക","സോഡ നാരങ്ങ"],b:"shop",
   ml:"കോമ്പോ സാധനം (ഉദാ: സോഡ + നാരങ്ങ): സാധനത്തിന്റെ ഷീറ്റിൽ \"made of other items?\" തുറന്ന് ഏതൊക്കെ സാധനം എത്ര വീതം എന്ന് ചേർക്കുക. വിൽക്കുമ്പോൾ അവയുടെ സ്റ്റോക്ക് തനിയെ കുറയും.",
   en:"Combo item (e.g. soda + lemon): in the item sheet open \"made of other items?\" and add the parts with a quantity each. Selling it takes the parts out of stock by itself.",go:null},
  {k:["ഗ്രാം","gram","കിലോ","kg","ലിറ്റർ","litre","മില്ലി","ml","മീറ്റർ","metre","meter","യൂണിറ്റ്","unit","ചാക്ക്"],b:"shop",
   ml:"യൂണിറ്റ്: സാധനത്തിന്റെ ഷീറ്റിൽ യൂണിറ്റ് (എണ്ണം, kg, ലിറ്റർ, മീറ്റർ...) തിരഞ്ഞെടുക്കുക. kg / ലിറ്റർ സാധനം വിൽക്കുമ്പോൾ 100, 250, 500, 750 ഗ്രാം / ml ചിപ്പുകൾ വരും. യൂണിറ്റ് തെറ്റിയാൽ \"Edit name and details\" കൊണ്ട് മാറ്റാം.",
   en:"Units: choose the unit in the item sheet (count, kg, litre, metre ...). Selling a kg / litre item shows 100, 250, 500, 750 g / ml chips. A wrong unit can be changed with \"Edit name and details\".",go:null},
  {k:["മൈക്ക്","mic","വോയിസ്","voice","പറഞ്ഞ് ചേർക്ക","ശബ്ദം","speak"],b:"all",
   ml:"വോയിസ്: താഴെ വലത് വശത്തെ മൈക്ക് ബട്ടൺ.\n• ഒരു ബോക്സിൽ ടൈപ്പ് ചെയ്യുമ്പോൾ മൈക്ക് തൊട്ടാൽ പറയുന്നത് ആ ബോക്സിൽ എഴുതും.\n• അല്ലാത്തപ്പോൾ \"അമർത്തി പറയൂ\" - കണക്ക് ചോദിക്കാം (\"ഈ മാസം ലാഭം എത്ര\"), ചെലവ് ചേർക്കാം (\"ഇന്ന് 500 രൂപ ഡീസൽ\"), ആപ്പ് എങ്ങനെ ഉപയോഗിക്കാം എന്നും ചോദിക്കാം.",
   en:"Voice: the mic button at the bottom right.\n• While typing in a box, tap the mic and what you say is written there.\n• Otherwise \"Tap and speak\" - ask figures (\"profit this month\"), add an expense (\"500 rupees diesel today\"), or ask how to use the app.",go:null},
  {k:["login","ലോഗിൻ","പുതിയ ഫോണിൽ കയറ","ഇമെയിൽ കോഡ്","email code","otp","sign in"],b:"all",
   ml:"ലോഗിൻ: ആപ്പ് തുറന്ന് മൊബൈൽ നമ്പറും ഇ-മെയിലും നൽകുക. ഇ-മെയിലിൽ വരുന്ന കോഡ് ടൈപ്പ് ചെയ്യുക. പുതിയ ഫോണിലും ഇതേ രീതി.",
   en:"Login: open the app, give your mobile number and e-mail, and type the code that comes by e-mail. The same on a new phone.",go:null},
  {k:["ഇൻസ്റ്റാൾ","install","home screen","ഹോം സ്ക്രീൻ","ആപ്പ് ഡൗൺലോഡ്","play store","പ്ലേ സ്റ്റോർ"],b:"all",
   ml:"ഇൻസ്റ്റാൾ: Chrome-ൽ travelconnect.dev തുറക്കുക › മുകളിലെ ⋮ മെനു › \"Install app\" / \"Add to Home screen\". iPhone: Safari › Share › \"Add to Home Screen\". Play Store-ൽ ഇല്ല.",
   en:"Install: open travelconnect.dev in Chrome › ⋮ menu at the top › \"Install app\" / \"Add to Home screen\". iPhone: Safari › Share › \"Add to Home Screen\". It is not on the Play Store.",go:null},
  {k:["km check","km മുന്നറിയിപ്പ്","km warning","വേഗം കൂടുതൽ","ഒരു അക്കം കൂടി","closing point","ക്ലോസിംഗ് പോയിന്റ്","എന്റെ ലൊക്കേഷൻ"],b:"travel",
   ml:"ലൈവ് ട്രിപ്പ് KM പരിശോധന: സ്റ്റോപ്പോ ട്രിപ്പ് അവസാനമോ സേവ് ചെയ്യുമ്പോൾ KM തെറ്റാണെന്ന് തോന്നിയാൽ (ഒരു അക്കം കൂടി, വേഗം മണിക്കൂറിൽ 110 km-ൽ കൂടുതൽ, മാപ്പ് km-മായി വലിയ വ്യത്യാസം) ആപ്പ് ചോദിക്കും - OK = എന്നാലും സേവ്, Cancel = തിരുത്തുക. ട്രിപ്പ് അവസാനിപ്പിക്കുന്ന ഫോമിൽ \"എന്റെ ലൊക്കേഷൻ എടുക്കുക\" (Premium).",
   en:"Live Trip KM check: when a stop or the end is saved and the KM looks wrong (one digit too many, faster than 110 km/h, far from the map km) the app asks - OK = save anyway, Cancel = correct it. The End Trip form has \"Take my location\" (Premium).",go:null}

 ];
 var SKC={};
 function qSkels(s){   /* skeletons of the question words, with the Malayalam case endings taken off too */
  if(SKC.s===s) return SKC.v;
  var out=[];
  s.split(/[\s,.?!]+/).forEach(function(w){ if(!w) return; var a=skel(w), b=skel(w.replace(/(യുടെ|ുടെ|ിന്റെ|ന്റെ|ിൽ|ിലെ|ിനു|ിന്|ക്ക്|ാൻ|ുക|ും|ാമോ|ാം)$/,"")); if(a.length>=2) out.push(a); if(b.length>=2&&b!==a) out.push(b); });
  SKC={s:s,v:out}; return out;
 }
 function fuzzy(kk,s){   /* every word of the keyword sounds like a word of the question */
  var ws=kk.split(/\s+/).filter(Boolean), Q=qSkels(s);
  if(!ws.length) return false;
  return ws.every(function(w){
   var k=skel(w); if(k.length<3) return false;
   return Q.some(function(x){ return x===k||(x.length>k.length&&x.indexOf(k)===0); });
  });
 }
 function scoreOf(tp,s){
  var sc=0;
  tp.k.forEach(function(k){ var kk=k.toLowerCase();
   if(kk.indexOf("+")>0){   /* "പേര്+മാറ്റ": every part somewhere in the question, in any order */
    var ps=kk.split("+"); if(ps.every(function(p){ return s.indexOf(p)>=0; })) sc+=Math.min(10,kk.replace(/[\s+]/g,"").length);
    return;
   } if(kk.length<=3?(" "+s+" ").indexOf(" "+kk+" ")>=0:s.indexOf(kk)>=0) sc+=Math.min(8,kk.replace(/\s/g,"").length);
   else if(kk.length>=4&&fuzzy(kk,s)) sc+=Math.min(6,Math.max(3,skel(kk).length+2)); });
  return sc;
 }
 function okFor(tp,shop,trv){
  if(tp.b==="all") return 2;
  if(tp.b==="shop") return shop?3:0;
  if(tp.b==="travel") return trv?3:0;
  if(tp.b==="docs") return (shop||!trv)?3:0;
  return 0;
 }
 function examples(shop,trv){
  if(shop) return {ml:"\"CA പാക്ക് എവിടെ\", \"ബിൽ വീണ്ടും എങ്ങനെ പ്രിന്റ് ചെയ്യും\", \"സാധനത്തിന്റെ പേര് എങ്ങനെ മാറ്റും\", \"സ്റ്റാഫ് ഫോൺ എങ്ങനെ ചേർക്കും\"",en:"\"where is the CA pack\", \"how to print a bill again\", \"how to change an item name\", \"how to add a staff phone\""};
  if(trv) return {ml:"\"ലൈവ് ട്രിപ്പ് എങ്ങനെ തുടങ്ങും\", \"GST റിപ്പോർട്ട് എവിടെ\", \"മാപ്പിൽ നിന്ന് km എങ്ങനെ\", \"ടോൾ എങ്ങനെ ചേർക്കും\"",en:"\"how to start a live trip\", \"where is the GST report\", \"how to get km from the map\", \"how to add toll\""};
  return {ml:"\"ക്വട്ടേഷൻ എങ്ങനെ ഉണ്ടാക്കും\", \"ബാക്കപ്പ് എങ്ങനെ എടുക്കും\", \"കുറി എവിടെ ചേർക്കും\", \"പ്ലാൻ എങ്ങനെ മാറ്റും\"",en:"\"how to make a quotation\", \"how to take a backup\", \"where to add a chitty\", \"how to change the plan\""};
 }
 window.tcVoHelp=function(raw){
  var s=norm(raw); if(s.trim().length<2) return null;
  var intent=INTENT.some(function(w){ return s.indexOf(w)>=0; }), L=window.tcVoLangOf(raw);
  var shop=shopOn(), trv=travelOn(), best=null, bs=0;
  T.forEach(function(tp){
   var f=okFor(tp,shop,trv); if(!f) return;
   var sc=scoreOf(tp,s); if(!sc) return;
   sc=sc*10+f;
   if(sc>bs){ bs=sc; best=tp; }
  });
  if(best){
   var g=null; try{ g=best.go?best.go():null; }catch(e){ g=null; }
   var dm=null; if(typeof best.demo==="function"){ try{ dm=best.demo(); }catch(e){ dm=null; } }
   return {kind:"help",ml:best.ml,en:best.en,go:g,demo:dm,intent:intent,lang:L};
  }
  if(intent){
   var ex=examples(shop,trv);
   return {kind:"help",intent:true,go:null,lang:L,
    ml:"ഈ ചോദ്യത്തിന് കൃത്യമായ ഉത്തരം കണ്ടെത്തിയില്ല. ഇങ്ങനെ ചോദിക്കൂ: "+ex.ml+". ഇല്ലെങ്കിൽ മെനു (☰) തുറന്ന് നോക്കൂ.",
    en:"I could not find that in the app help. Try: "+ex.en+". Or open the Menu (☰)."};
  }
  return null;
 };
 /* ---------- "Show me": a step-by-step demo on the real screen ----------
    steps = [{open?:function, sel:"css selector", ml, en}]. Each step opens its screen (if given), finds the element, scrolls to it,
    puts a glowing ring around it and a short sentence at the bottom with Next / Close. Nothing is tapped or saved by the demo. */
 var DM=null;
 function demoCss(){
  if(document.getElementById("tcDemoCss")) return;
  var st=document.createElement("style"); st.id="tcDemoCss";
  st.textContent="@keyframes tcDemoP{0%{box-shadow:0 0 0 0 rgba(245,166,35,.75)}70%{box-shadow:0 0 0 14px rgba(245,166,35,0)}100%{box-shadow:0 0 0 0 rgba(245,166,35,0)}}"+
   ".tcDemoHi{outline:3px solid #f5a623!important;outline-offset:3px;border-radius:10px;animation:tcDemoP 1.4s infinite;position:relative;z-index:2}"+
   "#tcDemoBox{position:fixed;left:10px;right:10px;bottom:14px;z-index:2147483000;background:#082b49;color:#fff;border-radius:16px;padding:14px 14px 10px;box-shadow:0 10px 30px rgba(0,0,0,.35);font-size:16px;line-height:1.45}"+
   "#tcDemoBox .n{font-size:12px;opacity:.75;margin-bottom:4px}#tcDemoBox .b{display:flex;gap:8px;margin-top:10px}#tcDemoBox button{flex:1;padding:10px;border:0;border-radius:10px;font-size:15px;font-family:inherit}"+
   "#tcDemoBox .go{background:#f5a623;color:#082b49;font-weight:800}#tcDemoBox .x{background:rgba(255,255,255,.15);color:#fff}";
  document.head.appendChild(st);
 }
 function unHi(){ var o=document.querySelectorAll(".tcDemoHi"); for(var i=0;i<o.length;i++) o[i].classList.remove("tcDemoHi"); }
 function visible(el){ return el&&el.offsetParent!==null; }
 function findEl(sel){ try{ var L=document.querySelectorAll(sel); for(var i=0;i<L.length;i++) if(visible(L[i])) return L[i]; return null; }catch(e){ return null; } }
 window.tcVoDemoStop=function(){ unHi(); var b=document.getElementById("tcDemoBox"); if(b) b.remove(); DM=null; };
 window.tcVoDemo=function(steps,lang){
  if(!steps||!steps.length) return;
  demoCss(); window.tcVoDemoStop(); DM={steps:steps,i:0,lang:lang==="en"?"en":(lang==="ml"?"ml":"")};
  show(0);
 };
 function txt(st){ var L=DM.lang||((typeof tcBl==="function"&&tcBl("en","ml")==="ml")?"ml":"en"); return L==="ml"?st.ml:st.en; }
 function show(i){
  if(!DM) return; DM.i=i; var st=DM.steps[i]; unHi();
  if(typeof st.open==="function"){ try{ st.open(); }catch(e){} }
  var tries=0;
  (function look(){
   if(!DM||DM.i!==i) return;
   var el=st.sel?findEl(st.sel):null;
   if(!el&&tries++<12){ setTimeout(look,150); return; }
   if(el){ el.classList.add("tcDemoHi"); try{ el.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e){} }
   var last=i>=DM.steps.length-1, ml=DM.lang==="ml"||(!DM.lang&&typeof tcBl==="function"&&tcBl("en","ml")==="ml");
   var box=document.getElementById("tcDemoBox");
   if(!box){ box=document.createElement("div"); box.id="tcDemoBox"; document.body.appendChild(box); }
   box.innerHTML='<div class="n">'+(i+1)+' / '+DM.steps.length+'</div><div>'+String(txt(st)).replace(/[&<>]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]; })+
    (el?'':'<div style="font-size:13px;opacity:.8;margin-top:4px">'+(st.later?"("+(ml?st.later[0]:st.later[1])+")":(ml?"(ഈ ബട്ടൺ ഇപ്പോൾ ഈ സ്ക്രീനിൽ കാണുന്നില്ല)":"(this button is not on the screen right now)"))+'</div>')+'</div>'+
    '<div class="b"><button class="x" type="button" onclick="tcVoDemoStop()">'+(ml?"അടയ്ക്കുക":"Close")+'</button><button class="go" type="button" onclick="'+(last?"tcVoDemoStop()":"tcVoDemoNext()")+'">'+(last?(ml?"മനസ്സിലായി":"Got it"):(ml?"അടുത്തത് ›":"Next ›"))+'</button></div>';
  })();
 }
 window.tcVoDemoNext=function(){ if(DM) show(Math.min(DM.i+1,DM.steps.length-1)); };
 window.__tcVoHelpTopics=T;   /* for the test */
})();
