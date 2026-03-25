/**
 * Transition Properties — Interactions & UX Enhancements
 * Linked in all HTML pages before </body>.
 * No external dependencies.
 */
(function () {
  'use strict';

  // ── 1. SCROLL ANIMATIONS (IntersectionObserver) ────────────
  function initScrollAnimations() {
    // Add data-anim to key elements that don't already have it
    var selectors = '.se > .si > .sh, .cd, .step-card, .faq-item, .cb, .fc';
    document.querySelectorAll(selectors).forEach(function (el) {
      if (!el.hasAttribute('data-anim')) {
        el.setAttribute('data-anim', 'up');
      }
    });

    // Stagger cards within grid containers
    document.querySelectorAll('.sg, .se .si').forEach(function (container) {
      var cards = container.querySelectorAll('.cd, .step-card');
      cards.forEach(function (card, i) {
        if (i < 6) card.setAttribute('data-anim-delay', String(i + 1));
      });
    });

    // Enable animations
    document.body.classList.add('anim-ready');

    if (!('IntersectionObserver' in window)) {
      // Fallback: show everything
      document.querySelectorAll('[data-anim]').forEach(function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-anim]').forEach(function (el) {
      observer.observe(el);
    });
  }

  // ── 2. IMPROVED MOBILE NAV ─────────────────────────────────
  function initMobileNav() {
    // Replace the global toggleMobileNav with improved version
    window.toggleMobileNav = function () {
      var nl = document.querySelector('.nl');
      var hb = document.querySelector('.hb');

      if (nl.classList.contains('mob-open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    };

    function openMobileNav() {
      var nl = document.querySelector('.nl');
      var hb = document.querySelector('.hb');
      nl.classList.add('mob-open');
      if (hb) hb.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Add close button if not present
      if (!nl.querySelector('.mob-close-btn')) {
        var btn = document.createElement('button');
        btn.className = 'mob-close-btn';
        btn.innerHTML = '\u00D7';
        btn.setAttribute('aria-label', 'Close menu');
        btn.onclick = closeMobileNav;
        nl.appendChild(btn);
      }
    }

    function closeMobileNav() {
      var nl = document.querySelector('.nl');
      var hb = document.querySelector('.hb');
      nl.classList.remove('mob-open');
      if (hb) hb.classList.remove('active');
      document.body.style.overflow = '';

      // Close all mobile dropdowns
      document.querySelectorAll('.dd.open').forEach(function (dd) {
        dd.classList.remove('open');
      });

      var cb = nl.querySelector('.mob-close-btn');
      if (cb) cb.remove();
    }

    // Mobile dropdown tap-to-toggle
    document.querySelectorAll('.dd-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function (e) {
        var nl = document.querySelector('.nl');
        if (!nl.classList.contains('mob-open')) return; // Desktop handled by CSS hover

        e.preventDefault();
        e.stopPropagation();
        var dd = this.closest('.dd');
        var wasOpen = dd.classList.contains('open');

        // Close all dropdowns first
        nl.querySelectorAll('.dd.open').forEach(function (d) {
          d.classList.remove('open');
        });

        if (!wasOpen) {
          dd.classList.add('open');
        }
      });
    });

    // Close mobile nav when clicking a link
    document.querySelectorAll('.nl .dd-menu a, .nl > a').forEach(function (link) {
      link.addEventListener('click', function () {
        var nl = document.querySelector('.nl');
        if (nl.classList.contains('mob-open')) {
          closeMobileNav();
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var nl = document.querySelector('.nl');
        if (nl && nl.classList.contains('mob-open')) {
          closeMobileNav();
        }
      }
    });
  }

  // ── 3. DESKTOP DROPDOWN HOVER DELAY ────────────────────────
  function initDesktopDropdowns() {
    var dropdowns = document.querySelectorAll('.dd');

    dropdowns.forEach(function (dd) {
      var closeTimer = null;

      dd.addEventListener('mouseenter', function () {
        if (window.innerWidth <= 900) return;
        clearTimeout(closeTimer);
        // Close other open dropdowns
        dropdowns.forEach(function (other) {
          if (other !== dd) other.classList.remove('open');
        });
        dd.classList.add('open');
      });

      dd.addEventListener('mouseleave', function () {
        if (window.innerWidth <= 900) return;
        closeTimer = setTimeout(function () {
          dd.classList.remove('open');
        }, 300); // 300ms delay before closing
      });
    });
  }

  // ── 4. ACTIVE PAGE HIGHLIGHTING ────────────────────────────
  function initActivePageHighlight() {
    var path = window.location.pathname.replace(/\/$/, '') || '/';

    document.querySelectorAll('.nl a[href], .dd-menu a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.startsWith('tel:') || href.startsWith('mailto:') || href === '#') return;

      var linkPath = href.replace(/\/$/, '') || '/';
      if (linkPath === path) {
        link.classList.add('nav-active');
        // Also highlight parent dropdown toggle
        var dd = link.closest('.dd');
        if (dd) {
          var toggle = dd.querySelector('.dd-toggle');
          if (toggle) toggle.classList.add('nav-active');
        }
      }
    });
  }

  // ── 5. FAQ ACCORDION ───────────────────────────────────────
  function initFaqAccordion() {
    document.querySelectorAll('.faq-q').forEach(function (q) {
      // Remove any existing inline onclick
      q.removeAttribute('onclick');

      q.addEventListener('click', function () {
        var item = this.closest('.faq-item');
        var wasOpen = item.classList.contains('open');

        // Close all siblings (single-open mode within same container)
        var container = item.parentElement;
        container.querySelectorAll('.faq-item.open').forEach(function (openItem) {
          if (openItem !== item) {
            openItem.classList.remove('open');
          }
        });

        item.classList.toggle('open', !wasOpen);
      });
    });
  }

  // ── 6. REPLACE DROPDOWN ARROWS WITH CSS CHEVRONS ───────────
  function initDropdownChevrons() {
    document.querySelectorAll('.dd-toggle').forEach(function (toggle) {
      // Remove the inline ▾ character
      var text = toggle.textContent.replace(/\s*[\u25BE\u25BC\u25BD\u25B8\u25B9\u25BA\u25BB\u9662]\s*$/, '').trim();
      toggle.textContent = '';
      toggle.appendChild(document.createTextNode(text + ' '));
      var chev = document.createElement('span');
      chev.className = 'dd-chev';
      chev.setAttribute('aria-hidden', 'true');
      toggle.appendChild(chev);
    });
  }

  // ── 7. CATEGORY NAV FILTER (FAQ page) ──────────────────────
  function initCategoryNav() {
    document.querySelectorAll('.cat-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        // Remove active from all
        document.querySelectorAll('.cat-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
      });
    });
  }

  // ── 8. SMOOTH SCROLL FOR ANCHOR LINKS ──────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ── 9. NAV BACKGROUND ON SCROLL ────────────────────────────
  function initNavScroll() {
    var nav = document.querySelector('.nv');
    if (!nav) return;

    var isDark = nav.classList.contains('nv-d');

    function updateNav() {
      if (window.scrollY > 60) {
        nav.style.boxShadow = '0 2px 24px rgba(44,24,16,0.08)';
        if (!isDark) {
          nav.style.background = 'rgba(255,250,245,0.97)';
        }
      } else {
        nav.style.boxShadow = '';
        if (!isDark) {
          nav.style.background = '';
        }
      }
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    initDropdownChevrons();
    initMobileNav();
    initDesktopDropdowns();
    initActivePageHighlight();
    initFaqAccordion();
    initCategoryNav();
    initSmoothScroll();
    initNavScroll();

    // Delay scroll animations slightly so page renders first
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        initScrollAnimations();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
