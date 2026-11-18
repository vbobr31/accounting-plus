import { bookingEndpoint } from './config.js';

const booking = document.querySelector('#booking');
const form = booking.querySelector('form');
const status = form.querySelector('.status');
const submit = form.querySelector('[type="submit"]');
const cookies = document.querySelector('.cookies');

document.querySelectorAll('[data-book]').forEach(button => {
  button.addEventListener('click', () => {
    form.elements.topic.value = button.dataset.topic || 'Общий вопрос';
    booking.showModal();
  });
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
});
document.querySelector('[data-policy]').addEventListener('click', () => {
  document.querySelector('#policy').showModal();
});
try {
  cookies.hidden = localStorage.getItem('cookieNoticeSeen') === 'yes';
} catch {
  cookies.hidden = false;
}
document.querySelector('[data-cookies]').addEventListener('click', () => {
  cookies.hidden = false;
  cookies.querySelector('button').focus();
});
document.querySelector('[data-dismiss]').addEventListener('click', () => {
  cookies.hidden = true;
  try {
    localStorage.setItem('cookieNoticeSeen', 'yes');
  } catch {
    // The notice can still be dismissed for the current page.
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  if (!bookingEndpoint) {
    status.textContent = 'Онлайн-запись пока недоступна.';
    return;
  }
  submit.disabled = true;
  status.textContent = 'Отправляем заявку…';
  try {
    const response = await fetch(bookingEndpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Delivery failed');
    form.reset();
    status.textContent = 'Заявка отправлена. Мы свяжемся с вами, чтобы согласовать время.';
  } catch {
    status.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз чуть позже.';
  } finally {
    submit.disabled = false;
  }
});
