const modal = document.querySelector('dialog');
const form = document.querySelector('#registration');
const status = form.querySelector('[role="status"]');
const submit = form.querySelector('[type="submit"]');
const resultPanel = document.createElement('section');
resultPanel.hidden = true;
resultPanel.setAttribute('role', 'status');
resultPanel.setAttribute('aria-live', 'polite');
modal.append(resultPanel);
const introduction = modal.querySelector('h2 + p');
function showResult(already) {
  form.hidden = true;
  introduction.hidden = true;
  modal.querySelector('h2').textContent = already ? 'You’re already registered.' : 'You’re registered.';
  resultPanel.replaceChildren();
  const message = document.createElement('p');
  message.textContent = already ? 'This email has already been registered from this browser. You don’t need to submit again.' : 'Your registration for RAGE POP-UP is confirmed. See you on October 31.';
  const done = document.createElement('button');
  done.className = 'form-button';
  done.type = 'button';
  done.textContent = 'Done';
  done.addEventListener('click', () => modal.close());
  resultPanel.append(message, done);
  resultPanel.hidden = false;
  done.focus();
}
async function registrationMarker(email) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  return 'rage-2026-' + Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

document.querySelectorAll('[data-rsvp]').forEach(button => button.addEventListener('click', event => {
  event.preventDefault();
  form.hidden = false;
  introduction.hidden = false;
  modal.querySelector('h2').textContent = 'Register';
  resultPanel.hidden = true;
  submit.disabled = false;
  submit.textContent = 'Register';
  status.textContent = '';
  modal.showModal();
}));
document.querySelector('.close').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const r = modal.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled || !form.reportValidity()) return;
  const key = window.RAGE_CONFIG?.accessKey;
  if (!key) {
    status.textContent = 'Registration is temporarily unavailable. Please try again shortly.';
    return;
  }
  const fields = Object.fromEntries(new FormData(form));
  if (fields.website || fields.botcheck) return;
  const data = {
    access_key: key,
    subject: 'RAGE POP-UP — new registration',
    from_name: 'RAGE POP-UP',
    name: fields.name.trim(),
    email: fields.email.trim().toLowerCase(),
    phone: fields.phone.trim(),
    event: 'RAGE POP-UP — October 31, 2026'
  };
  submit.disabled = true;
  let marker;
  try {
    marker = await registrationMarker(data.email);
    if (localStorage.getItem(marker) === 'confirmed') {
      submit.disabled = false;
      showResult(true);
      return;
    }
  } catch { /* Registration works even when browser storage is unavailable. */ }
  submit.textContent = 'Registering…';
  status.textContent = '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data), credentials: 'omit', signal: controller.signal });
    const result = await response.json();
    if (response.ok && result.success === true) {
      form.reset();
      try { if (marker) localStorage.setItem(marker, 'confirmed'); } catch {}
      showResult(false);
      submit.textContent = 'Registered';
      return;
    }
    status.textContent = response.status === 429 ? 'Too many attempts. Please wait before trying again.' : 'Your registration was not accepted. Please try again shortly.';
  } catch {
    status.textContent = 'We couldn’t confirm your registration. Please check your connection before trying again.';
  } finally {
    clearTimeout(timeout);
    if (submit.textContent !== 'Registered') { submit.disabled = false; submit.textContent = 'Register'; }
  }
});
