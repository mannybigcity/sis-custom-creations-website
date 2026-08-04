const menuButton = document.querySelector('.menu-button');
const mainNav = document.querySelector('#main-nav');
const seedStage = document.querySelector('#seed-stage');
const quoteForm = document.querySelector('#quote-form');
const formMessage = document.querySelector('#form-message');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;

const query = new URLSearchParams(window.location.search);
const requestedService = query.get('service');
const requestedOffer = query.get('offer');
const requestedDetails = query.get('details');
const requestedQuantity = query.get('quantity');
const requestedNeededBy = query.get('needed_by');

function getLeadSettings() {
  const leadConfig = window.SIS_LEAD_CONFIG || {};
  const supabaseUrl = (leadConfig.supabaseUrl || '').replace(/\/+$/, '');
  const supabaseKey = (leadConfig.supabaseKey || '').trim();

  return {
    leadEndpoint: (leadConfig.leadEndpoint || '/api/website-leads.php').trim(),
    supabaseUrl,
    supabaseKey,
    useDirectSupabase: Boolean(leadConfig.useDirectSupabase && supabaseUrl && supabaseKey),
    leadTables: leadConfig.tables || {}
  };
}

function setField(form, fieldNames, value) {
  if (!form || !value) return;
  for (const fieldName of fieldNames) {
    const field = form.elements.namedItem(fieldName);
    if (field) {
      field.value = value;
      return;
    }
  }
}

function populateLeadContext() {
  if (!quoteForm) return;
  setField(quoteForm, ['Service', 'Offer'], requestedService || requestedOffer || body.dataset.offer || '');
  setField(quoteForm, ['Project Details', 'Details'], requestedDetails);
  setField(quoteForm, ['Quantity', 'Guest Count'], requestedQuantity);
  setField(quoteForm, ['Needed By', 'Event Date'], requestedNeededBy);
  setField(quoteForm, ['Brand'], body.dataset.brand || 'SIS Custom Creations');
  setField(quoteForm, ['Offer Slug'], body.dataset.offerSlug || query.get('offer_slug') || '');
  setField(quoteForm, ['Page Title'], document.title);
  setField(quoteForm, ['Landing Page'], window.location.href);
  setField(quoteForm, ['Lead Source'], query.get('utm_source') || document.referrer || 'direct');
  setField(quoteForm, ['Lead Campaign'], query.get('utm_campaign') || query.get('utm_medium') || 'website');
}

populateLeadContext();

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferRecordKind(offerName, offerSlug, payload) {
  const haystack = [
    offerName,
    offerSlug,
    payload.Service,
    payload.Offer
  ].map((value) => String(value || '').toLowerCase()).join(' ');

  if (haystack.includes('subscription') || haystack.includes('monthly kit club') || haystack.includes('diy kit')) {
    return 'subscription';
  }

  if (
    haystack.includes('paint party') ||
    haystack.includes('splatter') ||
    haystack.includes('birthday') ||
    haystack.includes('daycare') ||
    haystack.includes('school') ||
    haystack.includes('party')
  ) {
    return 'reservation';
  }

  if (
    haystack.includes('engraving') ||
    haystack.includes('apparel') ||
    haystack.includes('shirt') ||
    haystack.includes('hat') ||
    haystack.includes('merch') ||
    haystack.includes('merchandise')
  ) {
    return 'quote';
  }

  return 'lead';
}

function buildLeadRecord(payload) {
  const offerName = String(payload.Offer || payload.Service || payload.Experience || payload.Project || '').trim();
  const offerSlug = String(payload['Offer Slug'] || payload['Service Slug'] || slugify(offerName)).trim() || slugify(offerName);
  const recordKind = inferRecordKind(offerName, offerSlug, payload);
  const quantity = String(payload.Quantity || payload['Guest Count'] || payload.Guests || '').trim();
  const neededBy = String(payload['Needed By'] || payload['Event Date'] || payload.Date || '').trim();

  return {
    id: crypto.randomUUID(),
    brand: String(payload.Brand || 'SIS Custom Creations').trim(),
    offer_slug: offerSlug,
    offer_name: offerName,
    record_kind: recordKind,
    name: String(payload.Name || payload['Full name'] || '').trim(),
    email: String(payload.Email || '').trim(),
    phone: String(payload.Phone || '').trim(),
    quantity,
    needed_by: neededBy || null,
    location: String(payload.Location || payload.City || '').trim(),
    zip_code: String(payload.Zip || payload.ZIP || payload['Postal Code'] || '').trim(),
    details: String(payload['Project Details'] || payload.Details || payload.Message || '').trim(),
    source: String(payload['Lead Source'] || payload.Source || 'direct').trim(),
    campaign: String(payload['Lead Campaign'] || payload.Campaign || 'website').trim(),
    landing_page: String(payload['Landing Page'] || payload['Page URL'] || window.location.href).trim(),
    page_title: String(payload['Page Title'] || document.title).trim(),
    status: String(payload.Status || 'new').trim(),
    payment_status: String(payload['Payment Status'] || 'unpaid').trim(),
    guest_count: String(payload['Guest Count'] || payload.Guests || quantity || '').trim(),
    raw_payload: payload,
    captured_at: new Date().toISOString()
  };
}

function buildSecondaryRows(payload, lead, leadTables) {
  if (lead.record_kind === 'reservation') {
    return [{
      table: leadTables.reservation || 'sis_reservations',
      row: {
        id: lead.id,
        sis_lead_id: lead.id,
        brand: lead.brand,
        offer_slug: lead.offer_slug,
        offer_name: lead.offer_name,
        record_kind: 'reservation',
        event_type: lead.offer_name,
        event_date: lead.needed_by,
        guest_count: lead.quantity || lead.guest_count || null,
        venue_name: lead.location,
        venue_zip: lead.zip_code,
        radius_miles: 50,
        status: lead.status,
        payment_status: lead.payment_status,
        details: lead.details,
        raw_payload: payload,
        captured_at: lead.captured_at
      }
    }];
  }

  if (lead.record_kind === 'subscription') {
    return [{
      table: leadTables.subscription || 'sis_subscriptions',
      row: {
        id: lead.id,
        sis_lead_id: lead.id,
        brand: lead.brand,
        offer_slug: lead.offer_slug,
        offer_name: lead.offer_name,
        record_kind: 'subscription',
        plan_name: lead.offer_name,
        cadence: 'monthly',
        start_date: lead.needed_by,
        quantity: Number.parseInt(lead.quantity, 10) || null,
        status: lead.status,
        payment_status: lead.payment_status,
        details: lead.details,
        raw_payload: payload,
        captured_at: lead.captured_at
      }
    }];
  }

  return [];
}

async function postSupabaseRow(leadSettings, table, row) {
  const response = await fetch(`${leadSettings.supabaseUrl}/rest/v1/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: {
      apikey: leadSettings.supabaseKey,
      Authorization: `Bearer ${leadSettings.supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase insert failed for ${table} (${response.status}): ${errorText || response.statusText}`);
  }

  return {
    status: 'inserted',
    synced: true,
    table_name: table
  };
}

if (!reduceMotion) {
  document.body.classList.add('has-motion');
}

function showMissingAsset(image) {
  const source = image.getAttribute('src') || 'unknown asset';
  const replacement = document.createElement('div');
  replacement.className = 'missing-asset';
  replacement.setAttribute('role', 'img');
  replacement.setAttribute('aria-label', `Missing Asset: ${source}`);
  replacement.innerHTML = `Missing Asset<span>${source}</span>`;
  image.replaceWith(replacement);
}

document.querySelectorAll('img').forEach((image) => {
  if (image.complete && image.naturalWidth === 0) showMissingAsset(image);
  image.addEventListener('error', () => showMissingAsset(image), { once: true });
});

document.querySelectorAll('.etsy-link').forEach((link) => {
  const configuredUrl = (link.dataset.etsyUrl || '').trim();
  if (!configuredUrl) {
    link.classList.add('needs-config');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector('#etsy-needed')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return;
  }

  link.href = configuredUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
});

function closeMenu() {
  if (!menuButton || !mainNav) return;
  mainNav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
}

if (menuButton && mainNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen && window.innerWidth < 980);
  });

  mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
}

const seedAssets = ['assets/sis-dandelion-seed-3d-transparent.svg'];

const seedFlightPlan = [
  { left: 4, start: '-10vw', sway: '24vw', time: '34s', delay: '-7s', scale: 1.08, tilt: '-18deg' },
  { left: 16, start: '-4vw', sway: '16vw', time: '29s', delay: '-22s', scale: 0.84, tilt: '21deg' },
  { left: 27, start: '2vw', sway: '31vw', time: '38s', delay: '-14s', scale: 1.18, tilt: '-32deg' },
  { left: 38, start: '-7vw', sway: '18vw', time: '31s', delay: '-29s', scale: 0.92, tilt: '13deg' },
  { left: 48, start: '8vw', sway: '-20vw', time: '36s', delay: '-4s', scale: 1.26, tilt: '-8deg' },
  { left: 60, start: '-5vw', sway: '22vw', time: '33s', delay: '-18s', scale: 0.88, tilt: '27deg' },
  { left: 69, start: '4vw', sway: '-15vw', time: '40s', delay: '-31s', scale: 1.12, tilt: '-24deg' },
  { left: 81, start: '7vw', sway: '-28vw', time: '35s', delay: '-11s', scale: 0.96, tilt: '18deg' },
  { left: 91, start: '-2vw', sway: '-19vw', time: '42s', delay: '-25s', scale: 1.32, tilt: '-14deg' },
  { left: 12, start: '6vw', sway: '26vw', time: '44s', delay: '-36s', scale: 1.2, tilt: '34deg' },
  { left: 53, start: '-12vw', sway: '12vw', time: '39s', delay: '-34s', scale: 1.02, tilt: '-28deg' },
  { left: 74, start: '-6vw', sway: '20vw', time: '37s', delay: '-2s', scale: 0.9, tilt: '7deg' }
];

function buildSeeds() {
  if (!seedStage || reduceMotion) return;
  const count = window.innerWidth < 720 ? 7 : seedFlightPlan.length;
  seedStage.innerHTML = '';

  seedFlightPlan.slice(0, count).forEach((settings, index) => {
    const seed = document.createElement('img');
    seed.className = 'seed';
    seed.src = seedAssets[index % seedAssets.length];
    seed.alt = '';
    seed.decoding = 'async';
    seed.style.left = `${settings.left}%`;
    seed.style.setProperty('--start', settings.start);
    seed.style.setProperty('--sway', settings.sway);
    seed.style.setProperty('--time', settings.time);
    seed.style.setProperty('--delay', settings.delay);
    seed.style.setProperty('--scale', settings.scale);
    seed.style.setProperty('--tilt', settings.tilt);
    seedStage.appendChild(seed);
  });
}

buildSeeds();
window.addEventListener('resize', () => {
  window.clearTimeout(window.__sisSeedResize);
  window.__sisSeedResize = window.setTimeout(buildSeeds, 220);
});

function readForm(form) {
  return Object.fromEntries(Array.from(new FormData(form).entries()).map(([key, value]) => [key, String(value).trim()]));
}

function showFormMessage(message, state) {
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.className = `form-message wide ${state}`;
  formMessage.hidden = false;
}

async function saveLead(payload) {
  const leadSettings = getLeadSettings();

  if (leadSettings.useDirectSupabase) {
    const lead = buildLeadRecord(payload);
    const rows = [
      { table: leadSettings.leadTables.lead || 'sis_leads', row: lead },
      ...buildSecondaryRows(payload, lead, leadSettings.leadTables)
    ];

    const results = {};
    results[rows[0].table] = await postSupabaseRow(leadSettings, rows[0].table, rows[0].row);

    for (const item of rows.slice(1)) {
      try {
        results[item.table] = await postSupabaseRow(leadSettings, item.table, item.row);
      } catch (error) {
        results[item.table] = {
          status: 'error',
          synced: false,
          table_name: item.table,
          error: error.message
        };
      }
    }

    return {
      success: true,
      supabase: {
        synced: true,
        mode: 'direct-supabase',
        record_kind: lead.record_kind,
        tables: results
      }
    };
  }

    const response = await fetch(leadSettings.leadEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const contentType = response.headers.get('content-type') || '';
  const parsed = contentType.includes('application/json') ? await response.json() : { success: false, error: await response.text() };
  if (!response.ok || parsed.success === false) {
    throw new Error(parsed.error || `Request failed with status ${response.status}`);
  }
  return parsed;
}

if (quoteForm) {
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!quoteForm.checkValidity()) {
      quoteForm.reportValidity();
      return;
    }

    const payload = readForm(quoteForm);
    const button = quoteForm.querySelector('button[type="submit"]');
    const originalText = button?.textContent || 'Send My Request';

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    try {
      const result = await saveLead(payload);
      showFormMessage('Thank you. Your request was received. SIS will be in touch soon.', 'success');
      quoteForm.reset();
      populateLeadContext();
      if (button) button.textContent = 'Request Sent';
    } catch (error) {
      showFormMessage(error.message || 'We could not send your request right now. Please try again.', 'error');
      if (button) button.textContent = 'Try Again';
    } finally {
      if (button) {
        window.setTimeout(() => {
          button.disabled = false;
          button.textContent = originalText;
        }, 2200);
      }
    }
  });
}

const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!newsletterForm.checkValidity()) {
      newsletterForm.reportValidity();
      return;
    }

    const button = newsletterForm.querySelector('button');
    const email = String(new FormData(newsletterForm).get('email') || '').trim();
    const firstName = String(new FormData(newsletterForm).get('first_name') || '').trim();
    const message = document.createElement('p');
    message.className = 'form-message success';
    message.setAttribute('role', 'status');
    message.textContent = 'Joining...';
    newsletterForm.appendChild(message);
    if (button) button.disabled = true;

    try {
      await saveLead({
        Name: firstName || 'Newsletter subscriber',
        Email: email,
        Service: 'SIS newsletter',
        'Project Details': 'Requested SIS creative updates and offers.',
        Brand: 'SIS Custom Creations',
        'Lead Source': 'newsletter',
        'Page Title': document.title,
        'Landing Page': window.location.href
      });
      message.textContent = 'You are on the SIS list. Watch for the next creative update.';
      newsletterForm.reset();
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'We could not add you right now. Please try again.';
    } finally {
      if (button) button.disabled = false;
    }
  });
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}
