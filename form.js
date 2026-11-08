/* =========================================================
   Contact form: validation + sending via Web3Forms (https://web3forms.com)
   - checks every field while typing / when leaving it, and again on submit
   - recognises typos in common e-mail domains ("gmial.com" -> "gmail.com")
   - sends the message with fetch, so the visitor stays on the page
   ========================================================= */

// Access key from web3forms.com (the key only allows sending to your own address, so it may be public)
const WEB3FORMS_ACCESS_KEY = 'YOUR_ACCESS_KEY_HERE';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact_form');
  if (!form) return;

  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    message: form.elements.message
  };
  const submitBtn = form.querySelector('.form_submit');
  const statusEl = document.getElementById('form_status');

  const TEXT = {
    de: {
      nameMissing: 'Bitte geben Sie Ihren Namen ein.',
      nameShort: 'Der Name ist zu kurz.',
      emailMissing: 'Bitte geben Sie Ihre E-Mail-Adresse ein.',
      emailInvalid: 'Bitte geben Sie eine gültige E-Mail-Adresse ein (z. B. name@firma.ch).',
      messageMissing: 'Bitte schreiben Sie eine Nachricht.',
      suggest: 'Meinten Sie',
      sending: 'Wird gesendet …',
      send: 'Nachricht senden',
      success: 'Vielen Dank! Ihre Nachricht wurde gesendet. Ich melde mich so bald wie möglich.',
      error: 'Die Nachricht konnte leider nicht gesendet werden. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an jasmin.marti89@gmail.com.',
      notConfigured: 'Das Formular ist noch nicht eingerichtet. Bitte schreiben Sie direkt an jasmin.marti89@gmail.com.',
      fixErrors: 'Bitte korrigieren Sie die markierten Felder.'
    },
    en: {
      nameMissing: 'Please enter your name.',
      nameShort: 'The name is too short.',
      emailMissing: 'Please enter your e-mail address.',
      emailInvalid: 'Please enter a valid e-mail address (e.g. name@company.com).',
      messageMissing: 'Please write a message.',
      suggest: 'Did you mean',
      sending: 'Sending …',
      send: 'Send message',
      success: 'Thank you! Your message has been sent. I will get back to you as soon as possible.',
      error: 'Unfortunately the message could not be sent. Please try again later or write directly to jasmin.marti89@gmail.com.',
      notConfigured: 'The form is not set up yet. Please write directly to jasmin.marti89@gmail.com.',
      fixErrors: 'Please correct the highlighted fields.'
    }
  };
  const t = () => TEXT[document.documentElement.lang === 'en' ? 'en' : 'de'];

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const COMMON_DOMAINS = ['gmail.com', 'googlemail.com', 'gmx.ch', 'gmx.net', 'gmx.de', 'bluewin.ch', 'hotmail.com', 'hotmail.ch',
    'outlook.com', 'yahoo.com', 'icloud.com', 'sunrise.ch', 'hispeed.ch', 'proton.me', 'protonmail.com', 'web.de', 'bfh.ch'];

  // Levenshtein distance: how many letters must be changed to turn a into b
  function distance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[b.length];
  }

  // Suggest a corrected address if the domain is very close to a common one (but not equal)
  function suggestEmail(value) {
    const at = value.lastIndexOf('@');
    if (at < 1) return null;
    const domain = value.slice(at + 1).toLowerCase();
    if (!domain || COMMON_DOMAINS.includes(domain)) return null;
    let best = null;
    COMMON_DOMAINS.forEach((d) => {
      const dist = distance(domain, d);
      if (dist > 0 && dist <= 2 && (!best || dist < best.dist)) best = { domain: d, dist };
    });
    return best ? value.slice(0, at + 1) + best.domain : null;
  }

  // Each check returns an error code (or null) so the message can be shown in the current language
  const checks = {
    name: (v) => (!v ? ['nameMissing'] : v.length < 2 ? ['nameShort'] : null),
    email: (v) => (!v ? ['emailMissing'] : !EMAIL_PATTERN.test(v) ? ['emailInvalid'] : null),
    message: (v) => (!v ? ['messageMissing'] : null)   // only required, no minimum length
  };
  const touched = {};

  function errorEl(field) { return document.getElementById(field.id + '_error'); }

  function showFieldState(key) {
    const field = fields[key];
    const value = field.value.trim();
    const result = checks[key](value);
    const el = errorEl(field);
    el.textContent = '';
    if (result) {
      const msg = t()[result[0]];
      el.textContent = typeof msg === 'function' ? msg(result[1]) : msg;
    } else if (key === 'email') {
      const suggestion = suggestEmail(value);
      if (suggestion) {
        // offer the correction as a button; one click takes it over
        el.append(t().suggest + ' ');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'form_suggest';
        btn.textContent = suggestion;
        btn.addEventListener('click', () => { field.value = suggestion; showFieldState('email'); field.focus(); });
        el.append(btn, '?');
      }
    }
    field.setAttribute('aria-invalid', result ? 'true' : 'false');
    field.closest('.form_field').classList.toggle('is_invalid', !!result);
    return !result;
  }

  Object.entries(fields).forEach(([key, field]) => {
    field.addEventListener('blur', () => { if (field.value.trim()) touched[key] = true; if (touched[key]) showFieldState(key); });
    field.addEventListener('input', () => { if (touched[key] || key === 'email') showFieldState(key); });
  });

  function setStatus(type, text) {
    statusEl.className = 'form_status' + (type ? ' is_' + type : '');
    statusEl.textContent = text;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', '');

    // honeypot: real visitors never see this field, bots fill it in
    if (form.elements.botcheck.checked) return;

    Object.keys(fields).forEach((key) => { touched[key] = true; });
    const valid = Object.keys(fields).map(showFieldState);
    if (valid.includes(false)) {
      setStatus('error', t().fixErrors);
      fields[Object.keys(fields)[valid.indexOf(false)]].focus();
      return;
    }

    if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'YOUR_ACCESS_KEY_HERE') {
      setStatus('error', t().notConfigured);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t().sending;
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: 'Portfolio: ' + (form.elements.subject.value.trim() || 'Neue Nachricht'),
          from_name: fields.name.value.trim(),
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          message: fields.message.value.trim()
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || response.status);
      form.reset();
      Object.keys(touched).forEach((key) => delete touched[key]);
      setStatus('success', t().success);
    } catch (err) {
      setStatus('error', t().error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t().send;
    }
  });

  // language switch: re-render the visible messages in the new language
  document.addEventListener('langchange', () => {
    Object.keys(fields).forEach((key) => { if (touched[key]) showFieldState(key); });
    if (!submitBtn.disabled) submitBtn.textContent = t().send;
    setStatus('', '');
  });
});
