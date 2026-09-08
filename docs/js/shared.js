/* ═══════════════════════════════════════════════════════════════
   VidyaSagar — js/shared.js
   Common helpers shared across modules. Loaded FIRST (before
   app.js/chat.js/social.js/games.js/typing.js/player.js) so every
   other file can rely on `escapeHtml` as a global.

   FIX: ye HTML-escaping helper pehle 6 alag files mein 3 alag
   naamon (_e, _esc, _escH) se copy-paste thi. Teen jagah (app.js,
   player.js, games.js) sirf &, < aur > escape karti thi - quotes (")
   NAHI. Jahan result ek HTML ATTRIBUTE ke andar likha jaata hai
   (jaise player.js ki catalog cards mein `data-title="${_esc(it.name)}"`),
   wahan agar kisi video/title ke naam mein " character ho, to wo
   attribute se bahar nikal ke arbitrary HTML/attribute inject kar
   sakta tha. Ab EK hi, attribute-safe implementation hai (&, <, >,
   ", ' sab escape) - baaki har file ka apna chhota naam (_e/_esc/
   _escH) isi par delegate karta hai, taaki purani sainkdon call-
   sites (`_esc(x)`, `_e(x)` waghera) bina chhede kaam karte rahein.
═══════════════════════════════════════════════════════════════ */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;
