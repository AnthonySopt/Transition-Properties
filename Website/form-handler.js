/**
 * Transition Properties — Form Handler
 * Intercepts .fc form containers and submits to the backend API.
 */
(function () {
  'use strict';

  // Map label text → JSON field name
  const FIELD_MAP = {
    'first name':              'first_name',
    'last name':               'last_name',
    'your name':               'name',
    'phone':                   'phone',
    'email':                   'email',
    'property address':        'address',
    'property address / location': 'address',
    'property type':           'property_type',
    'situation':               'situation',
    'asking price':            'asking_price',
    'deal details':            'details',
    'anything else? (optional)': 'details',
  };

  function labelToKey(text) {
    return FIELD_MAP[text.toLowerCase().trim()] || text.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  function collectFormData(container) {
    const data = {};
    const groups = container.querySelectorAll('label');
    groups.forEach(label => {
      const key   = labelToKey(label.textContent);
      const field = label.parentElement.querySelector('input, select, textarea');
      if (field && key) {
        data[key] = field.value.trim();
      }
    });
    return data;
  }

  function getEndpoint() {
    const path = window.location.pathname.replace(/\/$/, '');
    const commercialPages = ['/commercial', '/storage', '/mobile-parks', '/multifamily', '/industrial', '/office', '/retail'];
    return commercialPages.includes(path) ? '/api/leads/commercial' : '/api/leads/residential';
  }

  function validate(data, type) {
    const errors = [];
    if (!data.phone)         errors.push('Phone is required.');
    if (!data.email)         errors.push('Email is required.');
    if (!data.address)       errors.push('Property address is required.');
    if (!data.property_type) errors.push('Please select a property type.');
    if (type === 'residential' && !data.first_name && !data.last_name && !data.name) {
      errors.push('Your name is required.');
    }
    return errors;
  }

  function showBanner(container, message, isError) {
    let banner = container.querySelector('.tp-form-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'tp-form-banner';
      banner.style.cssText = [
        'margin-top:16px',
        'padding:14px 20px',
        'border-radius:8px',
        'font-weight:600',
        'font-size:1rem',
        'text-align:center',
      ].join(';');
      const btn = container.querySelector('.bs, button[class*="bs"]') || container.lastElementChild;
      btn.parentNode.insertBefore(banner, btn.nextSibling);
    }
    banner.textContent = message;
    banner.style.background  = isError ? '#FEE2E2' : '#D1FAE5';
    banner.style.color        = isError ? '#991B1B' : '#065F46';
    banner.style.border       = `1px solid ${isError ? '#FECACA' : '#A7F3D0'}`;
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.dataset.origText = btn.textContent;
      btn.textContent = 'Sending…';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    } else {
      btn.textContent = btn.dataset.origText || btn.textContent;
      btn.disabled = false;
      btn.style.opacity = '';
    }
  }

  function clearFields(container) {
    container.querySelectorAll('input, textarea').forEach(el => { el.value = ''; });
    container.querySelectorAll('select').forEach(el => { el.selectedIndex = 0; });
  }

  async function handleSubmit(container, btn) {
    const type     = getEndpoint().includes('commercial') ? 'commercial' : 'residential';
    const data     = collectFormData(container);
    const errors   = validate(data, type);

    if (errors.length) {
      showBanner(container, errors[0], true);
      return;
    }

    setLoading(btn, true);

    try {
      const res = await fetch(getEndpoint(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        showBanner(container, json.message, false);
        clearFields(container);
      } else {
        showBanner(container, json.error || 'Something went wrong. Please try again.', true);
      }
    } catch (err) {
      showBanner(container, 'Network error. Please check your connection and try again.', true);
    } finally {
      setLoading(btn, false);
    }
  }

  function init() {
    document.querySelectorAll('.fc').forEach(container => {
      const btn = container.querySelector('.bs');
      if (!btn) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(container, btn);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
