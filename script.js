/* =========================================================
   Jasmin Marti – Portfolio
   Loaded in <head> (not deferred) so the "js" class is set before the page is drawn;
   everything that needs the page content waits for DOMContentLoaded.
   ========================================================= */

// Lets the CSS hide sections until they fade in. Without JavaScript all content stays visible.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const menuBtn = document.getElementById('menu_btn');
  const upBlock = document.getElementById('up_block');
  const langSwitch = document.getElementById('lang_switch');

  // ---------- Language (DE / EN) ----------
  // German is written in the HTML; elements with data-en carry the English text right next to it.
  // data-en       -> text of the element
  // data-en-label -> aria-label (read by screen readers)
  // data-en-alt   -> alt text of an image
  const META = {
    de: { title: 'Jasmin Marti – Portfolio', description: 'Portfolio und Lebenslauf von Jasmin Marti', menuOpen: 'Menü öffnen', menuClose: 'Menü schliessen', switchTo: 'Switch to English' },
    en: { title: 'Jasmin Marti – Portfolio', description: 'Portfolio and CV of Jasmin Marti', menuOpen: 'Open menu', menuClose: 'Close menu', switchTo: 'Auf Deutsch wechseln' }
  };
  let lang = 'de';

  function setLang(next) {
    lang = next;
    document.documentElement.lang = next;
    document.querySelectorAll('[data-en]').forEach((el) => {
      if (el.dataset.de === undefined) el.dataset.de = el.textContent;   // remember the German text once
      el.textContent = next === 'en' ? el.dataset.en : el.dataset.de;
    });
    document.querySelectorAll('[data-en-label]').forEach((el) => {
      if (el.dataset.deLabel === undefined) el.dataset.deLabel = el.getAttribute('aria-label');
      el.setAttribute('aria-label', next === 'en' ? el.dataset.enLabel : el.dataset.deLabel);
    });
    document.querySelectorAll('[data-en-alt]').forEach((el) => {
      if (el.dataset.deAlt === undefined) el.dataset.deAlt = el.alt;
      el.alt = next === 'en' ? el.dataset.enAlt : el.dataset.deAlt;
    });
    document.title = META[next].title;
    document.querySelector('meta[name="description"]').setAttribute('content', META[next].description);
    menuBtn.setAttribute('aria-label', header.classList.contains('open') ? META[next].menuClose : META[next].menuOpen);
    langSwitch.setAttribute('aria-label', META[next].switchTo);
    langSwitch.querySelectorAll('[data-lang]').forEach((s) => s.classList.toggle('active', s.dataset.lang === next));
    try { localStorage.setItem('lang', next); } catch (e) { /* storage blocked: language is simply not remembered */ }
  }
  langSwitch.addEventListener('click', () => setLang(lang === 'de' ? 'en' : 'de'));
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) { /* ignore */ }
  setLang(saved === 'en' ? 'en' : 'de');

  // ---------- Menu open / close ----------
  function setMenu(open) {
    header.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? META[lang].menuClose : META[lang].menuOpen);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('open')));
  document.querySelectorAll('.menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // ---------- Solid header and up arrow once the intro is scrolled past ----------
  function onScroll() {
    header.classList.toggle('solid', window.scrollY > 40);
    upBlock.classList.toggle('show', window.scrollY > window.innerHeight * 0.8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Project tiles: open the matching detail pop-up; close with the X, Escape or a click on the dark background ----------
  document.querySelectorAll('.tile_open').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.project).showModal()));
  document.querySelectorAll('.project_dialog').forEach((dlg) => {
    dlg.querySelector('.dlg_close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  });

  // ---------- Fade sections in as they enter the screen ----------
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
});
