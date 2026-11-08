/**
 * VIVIMUSIC XTEN — loader.js
 *
 * Runs at document_start, before YT Music has painted anything, so we can
 * cover the page with our own splash before the stock UI has a chance to
 * flash in unstyled/partially-themed.
 */

(() => {
  'use strict';

  const OVERLAY_ID   = 'vivi-loading-overlay';
  const MIN_VISIBLE  = 350;   // avoid a jarring one-frame flash on fast loads
  const HARD_TIMEOUT = 8000;  // never block the app forever if something goes wrong

  let logoUrl = '';
  try {
    logoUrl = chrome.runtime.getURL('icons/custom-logo-icon.png');
  } catch { /* no-op */ }

  const shownAt = Date.now();

  function injectOverlay() {
    const style = document.createElement('style');
    style.id = OVERLAY_ID + '-style';
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: #030303;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
        opacity: 1;
        transition: opacity 0.4s ease;
      }
      #${OVERLAY_ID}.vivi-loading-hide {
        opacity: 0;
        pointer-events: none;
      }
      #${OVERLAY_ID} img {
        width: 72px;
        height: 72px;
        animation: vivi-loading-pulse 1.3s ease-in-out infinite;
      }
      #${OVERLAY_ID} .vivi-loading-text {
        font-family: 'Roboto', Arial, sans-serif;
        font-size: 15px;
        letter-spacing: 0.3px;
        color: rgba(255, 255, 255, 0.72);
      }
      @keyframes vivi-loading-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50%      { transform: scale(0.88); opacity: 0.6; }
      }
    `;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = 'ViviMusic Xten';

    const text = document.createElement('div');
    text.className = 'vivi-loading-text';
    text.textContent = 'Loading ViviMusic Xten…';

    overlay.appendChild(img);
    overlay.appendChild(text);

    const root = document.documentElement;
    root.appendChild(style);
    root.appendChild(overlay);
  }

  // documentElement always exists by the time a content script runs, even
  // at document_start, so we don't need to wait for it.
  injectOverlay();

  function removeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    const style   = document.getElementById(OVERLAY_ID + '-style');
    if (!overlay) return;

    const elapsed = Date.now() - shownAt;
    const wait = Math.max(0, MIN_VISIBLE - elapsed);

    setTimeout(() => {
      overlay.classList.add('vivi-loading-hide');
      overlay.addEventListener('transitionend', () => {
        overlay.remove();
        style?.remove();
      }, { once: true });
      // Fallback in case transitionend doesn't fire for some reason
      setTimeout(() => { overlay.remove(); style?.remove(); }, 600);
    }, wait);
  }

  function whenReady() {
    // YT Music is a SPA shell — "ready" means its nav bar / player bar has
    // actually mounted, not just that the HTML document finished loading.
    if (document.querySelector('ytmusic-nav-bar, ytmusic-player-bar')) {
      removeOverlay();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector('ytmusic-nav-bar, ytmusic-player-bar')) {
        observer.disconnect();
        removeOverlay();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Absolute fallback so a slow/odd load never leaves the cover stuck up.
    setTimeout(() => {
      observer.disconnect();
      removeOverlay();
    }, HARD_TIMEOUT);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', whenReady);
  } else {
    whenReady();
  }
})();
