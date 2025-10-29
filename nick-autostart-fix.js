
// Force auto-start after nickname save/skip (idempotent)
(function(){
  function startAfterNick(){
    try {
      document.getElementById('nickOverlay')?.classList.add('hidden');
      document.body.classList.remove('modal-open');
      const sel = document.getElementById('difficulty');
      const mode = (window.currentDiff || sel?.value || 'normal');
      if (typeof startGame === 'function') startGame(mode);
    } catch(e){ /* noop */ }
  }

  function wire(){
    const save = document.getElementById('btnSaveNick');
    const skip = document.getElementById('btnSkipNick');
    const inp  = document.getElementById('nickInput');
    if (save && !save.__autostart_wired){
      save.addEventListener('click', startAfterNick);
      save.__autostart_wired = true;
    }
    if (skip && !skip.__autostart_wired){
      skip.addEventListener('click', startAfterNick);
      skip.__autostart_wired = true;
    }
    if (inp && !inp.__enter_wired){
      inp.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter'){ e.preventDefault(); save?.click(); }
      });
      inp.__enter_wired = true;
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wire, { once:true });
  } else { wire(); }

  // also re-wire in case DOM overlays are re-rendered dynamically
  setTimeout(wire, 300);
  setTimeout(wire, 800);
})();
