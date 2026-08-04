const checkoutForm = document.querySelector('#sis-checkout-form');
const checkoutMessage = document.querySelector('#sis-checkout-message');
const paypalReadiness = document.querySelector('#sis-paypal-readiness');
const checkoutSummary = document.querySelector('#sis-checkout-summary');
const approvalLink = document.querySelector('#sis-paypal-approval-link');
const captureButton = document.querySelector('#sis-capture-button');
const checkoutResult = document.querySelector('#sis-checkout-result');
const resultOrder = document.querySelector('#sis-result-order');
const resultPayment = document.querySelector('#sis-result-payment');
const resultFulfillment = document.querySelector('#sis-result-fulfillment');
const accountStatusLink = document.querySelector('#sis-account-status-link');
const statusForm = document.querySelector('#sis-status-form');
const statusResult = document.querySelector('#sis-status-result');
const addCartItemButton = document.querySelector('#sis-add-cart-item');
const cartItemsNode = document.querySelector('#sis-cart-items');
const cartTotalNode = document.querySelector('#sis-cart-total');
const checkoutSubmitButton = checkoutForm?.querySelector('button[type="submit"]');

function loadStoredCartItems() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem('sis_cart_items') || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.name && Number(item.quantity || 0) > 0 && Number(item.unit_price || 0) > 0);
  } catch {
    return [];
  }
}

const checkoutState = {
  orderId: window.localStorage.getItem('sis_order_id') || '',
  accountToken: window.localStorage.getItem('sis_account_token') || '',
  cartId: window.localStorage.getItem('sis_cart_id') || '',
  cartItems: loadStoredCartItems()
};

function readForm(form) {
  return Object.fromEntries(Array.from(new FormData(form).entries()).map(([key, value]) => [key, String(value).trim()]));
}

function setMessage(node, message, state = 'info') {
  if (!node) return;
  node.textContent = message;
  node.className = `checkout-message ${state}`;
  node.hidden = false;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const parsed = await response.json().catch(() => ({}));
  if (!response.ok || parsed.success === false || parsed.ok === false) {
    throw new Error(parsed.error || `Request failed with status ${response.status}`);
  }
  return parsed;
}

function showCheckoutResult(order) {
  if (!order || !checkoutResult) return;
  resultOrder.textContent = order.id || 'Pending';
  resultPayment.textContent = order.payment_status || 'unpaid';
  resultFulfillment.textContent = order.fulfillment_status || 'locked';
  checkoutResult.hidden = false;
}

function statusTokenInput() {
  return statusForm?.querySelector('input[name="access_token"]');
}

function syncSavedAccountStatusLink() {
  const input = statusTokenInput();
  if (input && checkoutState.accountToken && !input.value) {
    input.value = checkoutState.accountToken;
  }
  if (accountStatusLink && checkoutState.accountToken) {
    accountStatusLink.href = '/account/';
    accountStatusLink.hidden = false;
  }
}

function saveState(orderId, accountToken) {
  checkoutState.orderId = orderId;
  checkoutState.accountToken = accountToken;
  window.localStorage.setItem('sis_order_id', orderId);
  window.localStorage.setItem('sis_account_token', accountToken);
  syncSavedAccountStatusLink();
}

function saveCartState(cartId) {
  checkoutState.cartId = cartId;
  window.localStorage.setItem('sis_cart_id', cartId);
}

function currentLineItem(fields) {
  const quantity = Number.parseInt(fields.quantity, 10) || 1;
  const unitPrice = Number.parseFloat(fields.unit_price);
  if (!fields.item_name || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error('Enter an item and amount before adding to your order.');
  }
  return {
    name: fields.item_name,
    description: fields.details,
    quantity,
    unit_price: unitPrice
  };
}

function cartTotal() {
  return checkoutState.cartItems.reduce((sum, item) => sum + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0);
}

function renderCart() {
  if (!cartItemsNode || !cartTotalNode) return;
  if (!checkoutState.cartItems.length) {
    cartItemsNode.innerHTML = '';
    cartTotalNode.textContent = 'Cart total: $0.00';
    return;
  }
  cartItemsNode.innerHTML = checkoutState.cartItems.map((item, index) => `
    <div class="cart-line">
      <span>${escapeHtml(item.quantity)} x ${escapeHtml(item.name)} - $${(Number(item.quantity || 1) * Number(item.unit_price || 0)).toFixed(2)}</span>
      <button type="button" data-remove-cart-index="${index}">Remove</button>
    </div>
  `).join('');
  cartTotalNode.textContent = `Cart total: $${cartTotal().toFixed(2)}`;
}

function persistCart() {
  window.localStorage.setItem('sis_cart_items', JSON.stringify(checkoutState.cartItems));
}

function addCurrentItemToCart() {
  try {
    checkoutState.cartItems.push(currentLineItem(readForm(checkoutForm)));
    persistCart();
    renderCart();
    setMessage(checkoutMessage, 'Item added to your order. Add another item or continue to checkout.', 'success');
  } catch (error) {
    setMessage(checkoutMessage, error.message, 'error');
  }
}

function checkoutPayload(fields) {
  const items = checkoutState.cartItems.length ? checkoutState.cartItems : [currentLineItem(fields)];
  const payload = {
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    details: fields.details,
    items
  };
  if (checkoutState.cartId) {
    payload.cart_id = checkoutState.cartId;
  }
  return payload;
}

async function createCheckout(event) {
  event.preventDefault();
  if (!checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
    return;
  }
  const button = checkoutForm.querySelector('button[type="submit"]');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Preparing payment...';

  let order = null;
  let accountToken = '';
  try {
    const draftResponse = await postJson('/api/sis/commerce/carts/draft/', checkoutPayload(readForm(checkoutForm)));
    saveCartState(draftResponse.cart?.id || '');
    checkoutSummary.textContent = `Your order draft ${draftResponse.cart?.id || 'draft'} is saved and ready for payment.`;
    const orderResponse = await postJson('/api/sis/commerce/orders/', checkoutPayload(readForm(checkoutForm)));
    order = orderResponse.order;
    accountToken = orderResponse.account.access_token;
    if (orderResponse.order?.cart_id) {
      saveCartState(orderResponse.order.cart_id);
    }
    saveState(order.id, accountToken);
    checkoutState.cartItems = [];
    persistCart();
    renderCart();
    showCheckoutResult(order);
    checkoutSummary.textContent = `Your order ${order.id} is saved. Keep this page open.`;

    const paypalResponse = await postJson(`/api/sis/commerce/orders/${encodeURIComponent(order.id)}/paypal/create/`, {
      account_token: accountToken
    });
    const approveUrl = paypalResponse.paypal?.approve_url || '';
    showCheckoutResult(paypalResponse.order || order);
    checkoutSummary.textContent = `Your order ${order.id} is ready. Open PayPal to complete payment.`;
    setMessage(checkoutMessage, 'Payment link ready. Open PayPal to complete payment.', 'success');
    await loadSavedAccountStatus();

    if (approveUrl) {
      approvalLink.href = approveUrl;
      approvalLink.hidden = false;
      captureButton.hidden = false;
    } else {
      setMessage(checkoutMessage, 'The payment step was created, but PayPal did not return a payment link. Please try again.', 'error');
    }
  } catch (error) {
    if (!order) {
      try {
        const fields = readForm(checkoutForm);
        const items = checkoutState.cartItems.length ? checkoutState.cartItems : [currentLineItem(fields)];
        const leadResponse = await fetch('/api/website-leads.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Name: fields.name,
            Email: fields.email,
            Phone: fields.phone,
            Service: 'SIS order and payment request',
            Quantity: String(items.reduce((total, item) => total + Number(item.quantity || 0), 0)),
            'Project Details': `${fields.details}\n\nCart:\n${items.map((item) => `${item.quantity} x ${item.name} at $${Number(item.unit_price).toFixed(2)}`).join('\n')}`,
            Brand: 'SIS Custom Creations',
            'Lead Source': 'homepage-cart',
            'Page Title': document.title,
            'Landing Page': window.location.href
          })
        });
        const leadData = await leadResponse.json().catch(() => ({}));
        if (!leadResponse.ok || leadData.success === false) {
          throw new Error(leadData.error || 'The SIS order request could not be sent.');
        }
        checkoutState.cartItems = [];
        persistCart();
        renderCart();
        checkoutSummary.textContent = 'Your cart request was received. SIS will confirm availability, pricing, and payment details.';
        setMessage(checkoutMessage, 'Your request was received. SIS will follow up with payment options.', 'success');
        return;
      } catch (fallbackError) {
        setMessage(checkoutMessage, fallbackError.message || error.message || 'The order request could not be sent.', 'error');
      }
    }
    if (order && accountToken) {
      showCheckoutResult(order);
      await loadSavedAccountStatus();
      setMessage(checkoutMessage, `Your order ${order.id} was saved, but payment is not available yet: ${error.message || 'unknown PayPal error'}.`, 'error');
    } else {
      setMessage(checkoutMessage, error.message || 'Payment could not be prepared yet.', 'error');
    }
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function loadPayPalReadiness() {
  if (!paypalReadiness) return;
  try {
    const response = await fetch('/api/sis/commerce/paypal/readiness/');
    const data = await response.json();
    if (!response.ok || data.sensitive_values_returned) {
      throw new Error(data.error || 'PayPal readiness unavailable.');
    }
    if (!data.configured) {
      setMessage(paypalReadiness, data.message || 'PayPal is not configured yet. You can still save the order request.', 'error');
      if (checkoutSubmitButton) checkoutSubmitButton.textContent = 'Send Order Request';
    } else {
      setMessage(paypalReadiness, `PayPal is ready (${data.environment || 'sandbox'}, ${data.currency || 'USD'}).`, 'success');
    }
  } catch (error) {
    setMessage(paypalReadiness, 'PayPal checkout is not connected on this host yet. You can still send an order request for SIS to confirm payment options.', 'error');
    if (checkoutSubmitButton) checkoutSubmitButton.textContent = 'Send Order Request';
  }
}

async function capturePayment() {
  if (!checkoutState.orderId || !checkoutState.accountToken) {
    setMessage(checkoutMessage, 'Create checkout first, then return after PayPal payment is complete.', 'error');
    return;
  }
  captureButton.disabled = true;
  captureButton.textContent = 'Checking payment...';
  try {
    const result = await postJson(`/api/sis/commerce/orders/${encodeURIComponent(checkoutState.orderId)}/paypal/capture/`, {
      account_token: checkoutState.accountToken
    });
    showCheckoutResult(result.order);
    setMessage(checkoutMessage, 'Payment received. SIS will review your order before production starts.', 'success');
    await loadSavedAccountStatus();
  } catch (error) {
    setMessage(checkoutMessage, error.message || 'Payment could not be confirmed yet.', 'error');
  } finally {
    captureButton.disabled = false;
    captureButton.textContent = 'Check Payment Status';
  }
}

function renderStatus(account) {
  const orders = account.orders || [];
  const tasks = account.fulfillment_tasks || [];
  if (!orders.length) {
    statusResult.innerHTML = '<p>No SIS orders were found for that order code.</p>';
    statusResult.hidden = false;
    return;
  }
  statusResult.innerHTML = orders.map((order) => {
    const task = tasks.find((item) => item.order_id === order.id) || {};
    return `
      <article class="status-card">
        <span>${escapeHtml(order.id)}</span>
        <h3>${escapeHtml(order.items.map((item) => item.name).join(', '))}</h3>
        <p><strong>Payment:</strong> ${escapeHtml(order.payment_status)}</p>
        <p><strong>Fulfillment:</strong> ${escapeHtml(task.status || order.fulfillment_status)}</p>
        <p><strong>Total:</strong> $${Number(order.total || 0).toFixed(2)} ${order.currency || 'USD'}</p>
      </article>
    `;
  }).join('');
  statusResult.hidden = false;
}

async function loadOrderStatus(event) {
  event?.preventDefault();
  const fields = readForm(statusForm);
  try {
    const response = await fetch(`/api/sis/commerce/account/${encodeURIComponent(fields.access_token)}/`);
    const parsed = await response.json();
    if (!response.ok || parsed.success === false) {
      throw new Error(parsed.error || 'Order status could not be loaded.');
    }
    renderStatus(parsed);
  } catch (error) {
    statusResult.innerHTML = `<p>${error.message || 'Order status could not be loaded.'}</p>`;
    statusResult.hidden = false;
  }
}

async function loadSavedAccountStatus() {
  if (!checkoutState.accountToken || !statusForm) return;
  const input = statusTokenInput();
  if (input) input.value = checkoutState.accountToken;
  await loadOrderStatus();
}

if (checkoutState.orderId && checkoutState.accountToken && captureButton) {
  captureButton.hidden = false;
  checkoutSummary.textContent = `Recent SIS order ${checkoutState.orderId} is available on this device.`;
  syncSavedAccountStatusLink();
  loadSavedAccountStatus().catch(() => {});
}

checkoutForm?.addEventListener('submit', createCheckout);
captureButton?.addEventListener('click', capturePayment);
statusForm?.addEventListener('submit', loadOrderStatus);
addCartItemButton?.addEventListener('click', addCurrentItemToCart);
cartItemsNode?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-cart-index]');
  if (!button) return;
  checkoutState.cartItems.splice(Number(button.dataset.removeCartIndex), 1);
  persistCart();
  renderCart();
});
syncSavedAccountStatusLink();
renderCart();
loadPayPalReadiness().catch(() => {});
