const kitIntro = document.querySelector('#kit-intro');
const kitVideo = document.querySelector('#kit-video');
const skipKitIntro = document.querySelector('#skip-kit-intro');
const subscribeButton = document.querySelector('#stripe-subscribe');
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
  const subscribeUrl = 'https://buy.stripe.com/fZu9AS4ba5ss64JenzfMA00';
  subscribeButton.textContent = 'Subscribe $38/mo';
  subscribeButton.href = subscribeUrl;
  subscribeButton.removeAttribute('aria-disabled');
  subscribeButton.removeAttribute('data-paypal-slot');
  subscribeButton.setAttribute('data-stripe-link', subscribeUrl);
  subscribeButton.classList.remove('disabled');
}

document.addEventListener('DOMContentLoaded', () => {
  startKitIntro();
  configureSubscriptionButton();
});
