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
  const url = (window.SIS_DIY_KITS_CONFIG?.paypalSubscriptionUrl || '').trim();
  if (!url) {
    subscribeButton.textContent = 'Join the interest list';
    subscribeButton.setAttribute('aria-disabled', 'true');
    subscribeButton.classList.add('disabled');
    subscribeButton.addEventListener('click', (event) => event.preventDefault());
    return;
  }
  subscribeButton.href = url;
  subscribeButton.textContent = 'Subscribe with PayPal';
  subscribeButton.removeAttribute('aria-disabled');
  subscribeButton.classList.remove('disabled');
  subscribeButton.target = '_blank';
  subscribeButton.rel = 'noopener noreferrer';
}

document.addEventListener('DOMContentLoaded', () => {
  startKitIntro();
  configureSubscriptionButton();
});
