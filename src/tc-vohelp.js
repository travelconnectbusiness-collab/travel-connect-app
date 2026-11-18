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
  return biz()==="shop"||biz()==="workshop";
 }
 function travelOn(){ return /taxi|travel|auto|cab|tempo|bus|vehicle/.test(biz()); }
 function norm(t){ return " "+String(t||"").toLowerCase().replace(/[.,!?;:"'()\[\]]/g," ").replace(/\s+/g," ").trim()+" "; }
 function inShop(f){ return function(){ if(!document.getElementById("tcShop")&&fn("tsOpen")) window.tsOpen("home"); setTimeout(f,60); }; }
 var INTENT=["എങ്ങനെ","എങ്ങിനെ","എവിടെ","എവിടന്ന്","എവിടുന്ന്","എവിടെനിന്ന്","എടുക്കാൻ","എടുക്കുക","എടുക്കും","ചെയ്യാൻ","ചെയ്യും","ചെയ്യുക","ചേർക്കാൻ","ചേർക്കും","മാറ്റാൻ","തിരുത്താൻ","കാണാൻ","ഉണ്ടാക്കാൻ","ഉണ്ടാക്കും","കിട്ടും","കിട്ടാൻ","അയക്കാൻ","പ്രിന്റ്","ഡൗൺലോഡ്","തുറക്കാൻ","സഹായം",
  " how to"," how do"," how can"," how should"," how will"," how i ","where ","help","open ","find ","get the","make a","print","download"];
 /* topics: k = keywords, b = for which businesses ('shop' shop book, 'travel' taxi / travel, 'docs' shop + skilled work, 'all'), ml / en = steps, go = opens it */
 var T=[
  {k:["ca pack","ca report","ca റിപ്പോർട്ട്","ca പാക്ക്","സി എ","സിഎ","സി.എ","സിആർ","സി ആർ","ഓഡിറ്റർ","auditor","accountant","അക്കൗണ്ടന്റ്","ചാർട്ടേഡ്"],b:"shop",
   ml:"CA പാക്ക് (ഒരു മാസത്തെ GST, ലാഭ-നഷ്ടം, കടം - ഒറ്റ Excel ഫയൽ):\n1. ഷോപ്പ് കണക്ക് തുറന്ന് \"ഇന്നത്തെ കണക്ക്\" അമർത്തുക.\n2. മുകളിൽ \"മാസം\" അമർത്തി ◀ ▶ കൊണ്ട് മാസം തിരഞ്ഞെടുക്കുക.\n3. ഏറ്റവും താഴെ \"CA പാക്ക്\" അമർത്തുക - ഫയൽ ഡൗൺലോഡ്സിൽ വരും, അത് CA-ക്ക് WhatsApp / ഇമെയിൽ ചെയ്യാം.\nശ്രദ്ധിക്കുക: ഇത് Platinum പ്ലാനിലാണ്. ഷോപ്പ് ഹോമിൽ \"ലാഭം മറയ്ക്കുക\" ഓണാണെങ്കിൽ ബട്ടൺ കാണില്ല - \"ലാഭം കാണിക്കുക\" അമർത്തുക.",
   en:"CA pack (one month's GST, profit-loss and dues in one Excel file):\n1. Open the shop accounts and tap \"Today's account\".\n2. Tap \"Month\" at the top and pick the month with ◀ ▶.\n3. Tap \"CA pack\" at the bottom - the file goes to Downloads; send it to your CA by WhatsApp / e-mail.\nNote: Platinum plan. If \"Hide profit\" is on (shop home), tap \"Show profit\" first.",
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
   go:function(){ return fn("tsOpen")?inShop(function(){ window.tsOpen("sale"); }):null; }},
  {k:["ബിൽ","bill","പ്രിന്റ്","print","റീപ്രിന്റ്","reprint","വീണ്ടും","pdf","പിഡിഎഫ്","whatsapp","വാട്സ്ആപ്പ്"],b:"shop",
   ml:"വിൽപ്പനയുടെ ബിൽ: വിൽപ്പന സേവ് ചെയ്യുമ്പോൾ \"സേവ് + ബിൽ\" അമർത്തുക - പ്രിന്റ്, PDF, ചിത്രം, WhatsApp. പഴയ ബിൽ വീണ്ടും: \"വിൽപ്പന\" സ്ക്രീനിലെ ലിസ്റ്റിലോ \"ഇന്നത്തെ കണക്ക്\" ലെ ഓരോ വിൽപ്പനയിലോ ഉള്ള ബിൽ ബട്ടൺ.",
   en:"A sale's bill: when saving the sale tap \"Save + bill\" - print, PDF, image, WhatsApp. An old bill again: the bill button on the sale in the \"Sale\" list or in \"Today's account\".",
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
  {k:["ക്വട്ടേഷൻ","quotation","എസ്റ്റിമേറ്റ്","estimate"],b:"travel",
   ml:"ടാക്സി ക്വട്ടേഷൻ: താഴത്തെ ടാബ് \"Quotations\" › പുതിയത്. റോഡ് km \"Road km\" / മാപ്പ് ബട്ടൺ വഴി.",
   en:"Taxi quotation: the bottom tab \"Quotations\" › new.",
   go:function(){ return fn("view")?function(){ window.view("quotations"); }:null; }},
  {k:["ലൈവ് ട്രിപ്പ്","live trip","ട്രിപ്പ് തുടങ്ങ","start trip","new trip","സ്റ്റോപ്പ്","stop","ട്രിപ്പ് അവസാനിപ്പി","end trip"],b:"travel",
   ml:"ലൈവ് ട്രിപ്പ്: ഡാഷ്ബോർഡ് › \"Live Trip Log\" › \"Start New Trip\" (കസ്റ്റമർ, വണ്ടി, തുടക്ക KM). ഓരോ സ്ഥലത്തും \"എന്താണ്\" തിരഞ്ഞെടുത്ത് സ്ഥലവും KM-ഉം ചേർക്കുക. അവസാനം \"End Trip\", പിന്നെ \"Create Bill\" - ബിൽ തനിയെ നിറയും.",
   en:"Live trip: Dashboard › \"Live Trip Log\" › \"Start New Trip\" (customer, vehicle, start KM). At each place pick \"What happened\", add place and KM. At the end \"End Trip\", then \"Create Bill\" - the bill fills itself.",
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
  {k:["my accounts","എന്റെ കണക്ക്","സ്വന്തം കണക്ക്","വ്യക്തിഗത","personal","കുറി","ചിട്ടി","chitty","kuri","കവർ","കല്യാണം","ceremony","gift","ലോൺ","loan","വായ്പ","കടം കൊടുത്ത","reminder","ഓർമ്മപ്പെടുത്തൽ","ബില്ലുകൾ"],b:"all",
   ml:"എന്റെ സ്വന്തം കണക്ക് (വരവ്-ചെലവ്, ലോൺ, കല്യാണ കവർ, കുറി / ചിട്ടി, ബിൽ ഓർമ്മപ്പെടുത്തൽ): മെനു › \"My Accounts\". കവർ പേരോ മൊബൈലോ കൊണ്ട് വർഷങ്ങൾക്ക് ശേഷവും തിരയാം.",
   en:"My own accounts (income-expense, loans, ceremony covers, chitty / kuri, bill reminders): Menu › \"My Accounts\". Covers can be searched by name or mobile even years later.",
   go:function(){ return fn("tcPersOpen")?function(){ window.tcPersOpen(); }:null; }},
  {k:["ബാക്കപ്പ്","backup","ഫോൺ മാറ്റ","new phone","പുതിയ ഫോൺ","restore","റീസ്റ്റോർ","ക്ലൗഡ്","cloud"],b:"all",
   ml:"ബാക്കപ്പ്: ഷോപ്പ് കണക്ക് സെർവറിൽ തനിയെ സിങ്ക് ആകും - പുതിയ ഫോണിൽ അതേ നമ്പറിൽ ലോഗിൻ ചെയ്താൽ മതി. ടാക്സി കണക്ക്: മെനു › \"Cloud Backup\" (Premium) അല്ലെങ്കിൽ \"Backup file\". സ്വന്തം കണക്ക്: My Accounts › \"Backup file / export\" - ആ ഫയൽ WhatsApp / Drive / Bluetooth വഴി പുതിയ ഫോണിലേക്ക് അയച്ച് അവിടെ ചേർക്കാം.",
   en:"Backup: the shop accounts sync to the server by themselves - log in with the same number on the new phone. Taxi books: Menu › \"Cloud Backup\" (Premium) or \"Backup file\". My Accounts: \"Backup file / export\" - send the file by WhatsApp / Drive / Bluetooth to the new phone and add it there.",
   go:null},
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
   go:null}
 ];
 function scoreOf(tp,s){
  var sc=0;
  tp.k.forEach(function(k){ var kk=k.toLowerCase();
   if(kk.indexOf("+")>0){   /* "പേര്+മാറ്റ": every part somewhere in the question, in any order */
    var ps=kk.split("+"); if(ps.every(function(p){ return s.indexOf(p)>=0; })) sc+=Math.min(10,kk.replace(/[\s+]/g,"").length);
    return;
   } if(kk.length<=3?(" "+s+" ").indexOf(" "+kk+" ")>=0:s.indexOf(kk)>=0) sc+=Math.min(8,kk.replace(/\s/g,"").length); });
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
  var intent=INTENT.some(function(w){ return s.indexOf(w)>=0; });
  var shop=shopOn(), trv=travelOn(), best=null, bs=0;
  T.forEach(function(tp){
   var f=okFor(tp,shop,trv); if(!f) return;
   var sc=scoreOf(tp,s); if(!sc) return;
   sc=sc*10+f;
   if(sc>bs){ bs=sc; best=tp; }
  });
  if(best){
   var g=null; try{ g=best.go?best.go():null; }catch(e){ g=null; }
   return {kind:"help",ml:best.ml,en:best.en,go:g,intent:intent};
  }
  if(intent){
   var ex=examples(shop,trv);
   return {kind:"help",intent:true,go:null,
    ml:"ഈ ചോദ്യത്തിന് കൃത്യമായ ഉത്തരം കണ്ടെത്തിയില്ല. ഇങ്ങനെ ചോദിക്കൂ: "+ex.ml+". ഇല്ലെങ്കിൽ മെനു (☰) തുറന്ന് നോക്കൂ.",
    en:"I could not find that in the app help. Try: "+ex.en+". Or open the Menu (☰)."};
  }
  return null;
 };
 window.__tcVoHelpTopics=T;   /* for the test */
})();
