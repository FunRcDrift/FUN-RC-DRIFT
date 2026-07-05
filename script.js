const contactButton = document.querySelector('#contactButton');
const toast = document.querySelector('#toast');
let toastTimer;

contactButton.addEventListener('click', () => {
  clearTimeout(toastTimer);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
});
