document.querySelectorAll('.petal').forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const closeCard = document.querySelector('.close-card');
if (closeCard) {
  closeCard.addEventListener('click', () => {
    closeCard.closest('.next-stream').style.display = 'none';
  });
}
