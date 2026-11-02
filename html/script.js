// Runs on every page. Plain JavaScript, no build step.

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const form = document.querySelector('[data-contact-form]');
if (form) {
  const status = form.querySelector('[data-form-status]');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    // Replace this with a real submission (a form service or your own endpoint).
    status.textContent = `Thanks! We will reach out to ${email}.`;
    status.hidden = false;
    form.reset();
  });
}
