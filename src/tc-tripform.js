/* Trip entry form in the same numbered sections as the Trip report (tc-tripform.js, loaded by tc-regdocs.js after tc-tripcards.js).
   The old "Actual Trip Details" window (editTrip in business.js) was one long list of boxes. This module re-arranges the SAME boxes
   (same ids, so saveTrip in business.js is untouched and saves exactly as before) into:
     1. Trip details        bill entry date, start/closing date + time, start point, destinations, closing point
     2. KM, hours, days     actual KM (from the trip meter), hours, days, overnight rest hours
     3. Driver              driver name + mobile (this trip only)
     4. Other charges       the existing Other Charges boxes
     5. Payment and expenses  buttons: Payment received / Expense / Trip report (the same windows the Trip report uses)
   Nothing is stored by this module and no field is added or removed. */
(function(){
 if(window.__tcTripForm) return;
 window.__tcTripForm=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var HEAD='border-top:1px solid #e1e6ea;margin-top:12px;padding-top:6px;font-weight:800;color:#0b6b78;font-size:13.5px';
 function head(n,en,ml){ var d=document.createElement("div"); d.setAttribute("style",HEAD); d.className="tcTfHead"; d.innerHTML=n+". "+E(B(en,ml)); return d; }
 function rearrange(id){
  var mb=document.getElementById("modalBody"); if(!mb||mb.getAttribute("data-tf")==="1") return;
  var grid=mb.querySelector(".grid"); if(!grid||!document.getElementById("aKm")||!document.getElementById("aStart")) return;
  var byId={}; Array.prototype.slice.call(grid.children).forEach(function(l){ var i=l.querySelector("input,select"); if(i&&i.id) byId[i.id]=l; });
  var groups=[
   [1,"Trip details","ട്രിപ്പ് വിവരങ്ങൾ",["aEntryDate","aStart","aTime","aClose","aCloseTime","aPickup","aDest","aReturn"]],
   [2,"KM, hours, days","KM, മണിക്കൂർ, ദിവസം",["aKm","aHours","aDays","aRestHours"]],
   [3,"Driver (this trip only)","ഡ്രൈവർ (ഈ ട്രിപ്പിന് മാത്രം)",["aDriverName","aDriverMobile"]]
  ];
  var frag=document.createDocumentFragment(), used={};
  groups.forEach(function(g){
   var g2=document.createElement("div"); g2.className="grid";
   g[3].forEach(function(k){ if(byId[k]){ g2.appendChild(byId[k]); used[k]=1; } });
   if(!g2.children.length) return;
   frag.appendChild(head(g[0],g[1],g[2])); frag.appendChild(g2);
  });
  /* any box a later version adds stays visible, at the end of section 1 area */
  var left=Array.prototype.slice.call(grid.children);
  if(left.length){ var g3=document.createElement("div"); g3.className="grid"; left.forEach(function(l){ g3.appendChild(l); }); frag.appendChild(g3); }
  grid.parentNode.insertBefore(frag,grid); grid.parentNode.removeChild(grid);
  /* 4. other charges: the existing heading + boxes */
  var h4=mb.querySelector("h4");
  if(h4){ h4.parentNode.insertBefore(head(4,"Other charges","മറ്റ് ചാർജുകൾ"),h4); h4.style.display="none"; var note=document.createElement("div"); note.className="muted"; note.style.cssText="font-size:12px"; note.textContent=B("Optional - fill in whichever are known","ഓപ്ഷണൽ - അറിയുന്നവ മാത്രം നൽകുക"); h4.parentNode.insertBefore(note,h4.nextSibling); }
  /* 5. payment and expenses (same windows as the Trip report) */
  var save=mb.querySelector("button.primary");
  var box=document.createElement("div");
  var bs="font-size:13px;padding:6px 12px";
  box.innerHTML='<div class="actions" style="flex-wrap:wrap;margin-top:4px"><button onclick="tcTrDo(\'recv\',\''+id+'\')" style="'+bs+'">&#10004; '+E(B("Payment received","പണം കിട്ടി"))+'</button>'+
   '<button onclick="tcTrDo(\'exp\',\''+id+'\')" style="'+bs+'">- '+E(B("Expense","ചെലവ്"))+'</button>'+
   '<button onclick="closeModal();tcTrOpen(\''+id+'\')" style="'+bs+'">&#129523; '+E(B("Trip report","ട്രിപ്പ് റിപ്പോർട്ട്"))+'</button></div>'+
   '<div class="muted" style="font-size:11.5px">'+E(B("These open another window - save the trip details first.","ഇവ മറ്റൊരു വിൻഡോ തുറക്കും - ആദ്യം ട്രിപ്പ് വിവരങ്ങൾ സേവ് ചെയ്യുക."))+'</div>';
  var hd=head(5,"Payment and expenses","പേയ്മെന്റും ചെലവും");
  if(save){ save.parentNode.insertBefore(hd,save); save.parentNode.insertBefore(box,save); } else { mb.appendChild(hd); mb.appendChild(box); }
  mb.setAttribute("data-tf","1");
 }
 var orig=window.editTrip;
 if(typeof orig==="function" && typeof window.tcTrOpen==="function") window.editTrip=function(id){
  var r=orig.apply(this,arguments);
  try{ var mb=document.getElementById("modalBody"); if(mb) mb.removeAttribute("data-tf"); rearrange(id); }catch(e){}
  return r;
 };
})();
