const kitIntro = document.querySelector('#kit-intro');
const kitVideo = document.querySelector('#kit-video');
const skipKitIntro = document.querySelector('#skip-kit-intro');
const subscribeButton = document.querySelector('#paypal-subscribe');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const introRequested = new URLSearchParams(window.location.search).get('intro') === 'build';

function hideKitIntro() {
  if (!kitIntro) return;
  kitIntro.classList.add('is-hidden');
  document.body.classList.remove('intro-active');
  if (kitVideo) {
    kitVideo.pause();
    kitVideo.removeAttribute('src');
    kitVideo.load();
  }
  window.setTimeout(() => kitIntro.remove(), 240);
}

function startKitIntro() {
  if (!kitIntro) return;
  if (!introRequested || reducedMotion) {
    kitIntro.remove();
    return;
  }
  document.body.classList.add('intro-active');
  const source = kitVideo?.dataset.src?.trim();
  const timeout = window.setTimeout(hideKitIntro, 5200);

  if (source && kitVideo) {
    kitVideo.src = source;
    kitVideo.load();
    kitVideo.addEventListener('ended', () => {
      window.clearTimeout(timeout);
      hideKitIntro();
    }, { once: true });
    kitVideo.play().catch(() => {});
  }

  skipKitIntro?.addEventListener('click', () => {
    window.clearTimeout(timeout);
    hideKitIntro();
  });
}

function configureSubscriptionButton() {
  if (!subscribeButton) return;
  subscribeButton.textContent = 'Book / Pay coming soon';
  subscribeButton.href = '#pay-coming-soon';
  subscribeButton.setAttribute('aria-disabled', 'true');
  subscribeButton.setAttribute('data-paypal-slot', 'replace');
  subscribeButton.setAttribute('data-stripe-link', 'TODO');
  subscribeButton.classList.add('disabled');
  subscribeButton.addEventListener('click', (event) => event.preventDefault());
}

document.addEventListener('DOMContentLoaded', () => {
  startKitIntro();
  configureSubscriptionButton();
});
