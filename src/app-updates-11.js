/* ---------- FIX: Remove stale "Planned next phase" text on Admin page ----------
   This was a placeholder from very early development, listing features
   (structured enquiry/booking workflow, vehicle-wise ledger) that are
   either already built now or superseded by other work since - it no
   longer reflects anything actually planned, so it's just confusing
   leftover text. Wraps admin() to find and remove that specific line. */
(function(){
 const orig=admin;
 admin=function(){
  orig();
  document.querySelectorAll(".card h3").forEach(h=>{
   if(h.textContent.trim()==="Planned next phase"){
    const next=h.nextElementSibling;
    h.remove();
    if(next&&next.tagName==="P") next.remove();
   }
  });
 };
})();
render();
