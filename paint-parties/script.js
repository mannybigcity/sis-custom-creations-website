const paintConfig = window.SIS_PAINT_PARTIES_CONFIG || {};

function configureOfferButton(button, url, fallbackLabel) {
  if (!button) return;
  const trimmedUrl = String(url || '').trim();
  if (!trimmedUrl) {
    button.textContent = fallbackLabel;
    button.setAttribute('aria-disabled', 'true');
    button.classList.add('disabled');
    button.addEventListener('click', (event) => event.preventDefault());
    return;
  }
  button.href = trimmedUrl;
  button.textContent = 'Reserve with $50 deposit';
  button.setAttribute('data-stripe-link', trimmedUrl);
  button.removeAttribute('aria-disabled');
  button.removeAttribute('data-paypal-slot');
  button.classList.remove('disabled');
}

document.addEventListener('DOMContentLoaded', () => {
  configureOfferButton(document.querySelector('[data-offer-pay="adult"]'), paintConfig.adultPaymentUrl, 'Request adult party details');
  configureOfferButton(document.querySelector('[data-offer-pay="kids"]'), paintConfig.kidsPaymentUrl, 'Request kids party details');
  configureOfferButton(document.querySelector('[data-offer-pay="school"]'), paintConfig.schoolPaymentUrl, 'Request school event details');
});
