/**
 * Densmore Insurance Chat Widget — iife.js
 * Self-contained embeddable widget. Drop into any page:
 *
 *   <link rel="stylesheet" href="/widget/iife.css">
 *   <script src="/widget/iife.js"></script>
 *
 * Optional config before the script tag:
 *   <script>
 *     window.DensmoreChatConfig = {
 *       apiBase: 'https://your-server.com',   // default: auto-detect
 *       title:   'Insurance Assistant',        // header title
 *       subtitle:'Ask me anything',            // header subtitle
 *     };
 *   </script>
 */

;(function (window, document) {
  'use strict';

  /* ── Config ──────────────────────────────────────────────── */
  var cfg = window.DensmoreChatConfig || {};
  var API_BASE = cfg.apiBase || '';   // empty = same origin
  var TITLE    = cfg.title    || 'Densmore Insurance';
  var SUBTITLE = cfg.subtitle || 'Ask me anything';

  /* ── State ───────────────────────────────────────────────── */
  var isOpen     = false;
  var isLoading  = false;
  var sessionId  = 'dmi_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

  /* ── Quick chips ─────────────────────────────────────────── */
  var CHIPS = [
    { icon: '🏠', label: 'Home insurance',     msg: 'What does home insurance cover?' },
    { icon: '🚗', label: 'Auto insurance',      msg: 'Tell me about auto insurance options.' },
    { icon: '💼', label: 'Business coverage',   msg: 'What business insurance do you offer?' },
    { icon: '🏢', label: 'Renters insurance',   msg: 'How much does renters insurance cost?' },
    { icon: '🌊', label: 'Flood insurance',     msg: 'Do I need flood insurance in Iowa?' },
    { icon: '🐎', label: 'Equine coverage',     msg: 'Tell me about equine insurance.' },
    { icon: '📋', label: 'File a claim',        msg: 'How do I file an insurance claim?' },
    { icon: '📞', label: 'Contact info',        msg: 'What are your office hours and contact details?' },
  ];

  /* ── Helpers ─────────────────────────────────────────────── */
  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html)      node.innerHTML = html;
    return node;
  }

  function formatTime() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
  }

  function formatText(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  /* ── Build DOM ───────────────────────────────────────────── */
  function build() {

    /* Launcher button */
    var launcher = el('button', 'dmi-launcher');
    launcher.setAttribute('aria-label', 'Open chat');
    launcher.innerHTML =
      '<div class="dmi-launcher-icon">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
        '</svg>' +
      '</div>' +
      '<div class="dmi-launcher-close">✕</div>' +
      '<div class="dmi-badge" id="dmi-badge">1</div>';

    /* Widget panel */
    var widget = el('div', 'dmi-widget');
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-label', 'Insurance chat assistant');

    /* Header */
    var header = el('div', 'dmi-header');
    header.innerHTML =
      '<div class="dmi-header-avatar">🛡️</div>' +
      '<div class="dmi-header-text">' +
        '<div class="dmi-header-title">' + TITLE + '</div>' +
        '<div class="dmi-header-subtitle"><span class="dmi-status-dot"></span>' + SUBTITLE + '</div>' +
      '</div>' +
      '<div class="dmi-header-actions">' +
        '<button class="dmi-btn-icon" id="dmi-clear-btn" title="New conversation">↺</button>' +
      '</div>';

    /* Chips */
    var chipsBar = el('div', 'dmi-chips');
    CHIPS.forEach(function (c) {
      var chip = el('button', 'dmi-chip');
      chip.textContent = c.icon + ' ' + c.label;
      chip.addEventListener('click', function () { sendMessage(c.msg); });
      chipsBar.appendChild(chip);
    });

    /* Messages */
    var messages = el('div', 'dmi-messages');
    messages.id = 'dmi-messages';

    /* Input */
    var inputArea = el('div', 'dmi-input-area');
    var inputRow  = el('div', 'dmi-input-row');

    var textarea = document.createElement('textarea');
    textarea.className   = 'dmi-textarea';
    textarea.id          = 'dmi-textarea';
    textarea.rows        = 1;
    textarea.placeholder = 'Ask an insurance question…';
    textarea.addEventListener('input',   function () { autoResize(this); });
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    var sendBtn = el('button', 'dmi-send-btn');
    sendBtn.id = 'dmi-send-btn';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>' +
      '</svg>';
    sendBtn.addEventListener('click', function () { sendMessage(); });

    inputRow.appendChild(textarea);
    inputRow.appendChild(sendBtn);

    var hint = el('div', 'dmi-input-hint', 'Enter to send &nbsp;·&nbsp; Shift+Enter for new line');
    inputArea.appendChild(inputRow);
    inputArea.appendChild(hint);

    /* Footer */
    var footer = el('div', 'dmi-footer',
      'Powered by <a href="https://densmoreis.com" target="_blank">Densmore Insurance</a>');

    /* Toast */
    var toast = el('div', 'dmi-toast');
    toast.id = 'dmi-toast';

    /* Assemble */
    widget.appendChild(header);
    widget.appendChild(chipsBar);
    widget.appendChild(messages);
    widget.appendChild(inputArea);
    widget.appendChild(footer);

    document.body.appendChild(launcher);
    document.body.appendChild(widget);
    document.body.appendChild(toast);

    /* Events */
    launcher.addEventListener('click', toggleWidget);
    document.getElementById('dmi-clear-btn').addEventListener('click', clearChat);

    /* Welcome message */
    appendBotMessage(
      "Hi there! 👋 I'm the **Densmore Insurance** virtual assistant.\n\n" +
      "I can help with questions about home, auto, business, farm, equine coverage — and more. " +
      "What can I help you with today?"
    );

    return { widget: widget, launcher: launcher };
  }

  /* ── Toggle ──────────────────────────────────────────────── */
  var els = null;

  function toggleWidget() {
    isOpen = !isOpen;
    els.widget.classList.toggle('dmi-visible', isOpen);
    els.launcher.classList.toggle('dmi-open', isOpen);

    // Hide badge on first open
    var badge = document.getElementById('dmi-badge');
    if (badge) badge.style.display = 'none';

    if (isOpen) {
      setTimeout(function () {
        var ta = document.getElementById('dmi-textarea');
        if (ta) ta.focus();
        scrollBottom();
      }, 260);
    }
  }

  /* ── Messages ────────────────────────────────────────────── */
  function scrollBottom() {
    var msgs = document.getElementById('dmi-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function appendBotMessage(text) {
    var msgs = document.getElementById('dmi-messages');
    if (!msgs) return;

    var row    = el('div', 'dmi-msg dmi-bot');
    var avatar = el('div', 'dmi-msg-avatar', '🛡️');
    var col    = el('div');
    var bubble = el('div', 'dmi-bubble');
    bubble.innerHTML = formatText(text);
    var ts = el('div', 'dmi-timestamp', formatTime());

    col.appendChild(bubble);
    col.appendChild(ts);
    row.appendChild(avatar);
    row.appendChild(col);
    msgs.appendChild(row);
    scrollBottom();
  }

  function appendUserMessage(text) {
    var msgs = document.getElementById('dmi-messages');
    if (!msgs) return;

    var row    = el('div', 'dmi-msg dmi-user');
    var avatar = el('div', 'dmi-msg-avatar', '👤');
    var col    = el('div');
    var bubble = el('div', 'dmi-bubble');
    bubble.textContent = text;
    var ts = el('div', 'dmi-timestamp', formatTime());

    col.appendChild(bubble);
    col.appendChild(ts);
    row.appendChild(col);
    row.appendChild(avatar);
    msgs.appendChild(row);
    scrollBottom();
  }

  function showTyping() {
    var msgs = document.getElementById('dmi-messages');
    if (!msgs) return;

    var row    = el('div', 'dmi-msg dmi-bot dmi-typing');
    row.id     = 'dmi-typing';
    var avatar = el('div', 'dmi-msg-avatar', '🛡️');
    var bubble = el('div', 'dmi-bubble',
      '<div class="dmi-dot"></div><div class="dmi-dot"></div><div class="dmi-dot"></div>');

    row.appendChild(avatar);
    row.appendChild(bubble);
    msgs.appendChild(row);
    scrollBottom();
  }

  function removeTyping() {
    var t = document.getElementById('dmi-typing');
    if (t) t.parentNode.removeChild(t);
  }

  function showToast(msg) {
    var toast = document.getElementById('dmi-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('dmi-toast-show');
    setTimeout(function () { toast.classList.remove('dmi-toast-show'); }, 3500);
  }

  /* ── Send ────────────────────────────────────────────────── */
  function sendMessage(overrideText) {
    if (isLoading) return;

    var ta   = document.getElementById('dmi-textarea');
    var btn  = document.getElementById('dmi-send-btn');
    var text = (overrideText || (ta && ta.value) || '').trim();
    if (!text) return;

    if (ta) { ta.value = ''; ta.style.height = 'auto'; }

    appendUserMessage(text);
    isLoading = true;
    if (btn) btn.disabled = true;
    if (ta)  ta.disabled  = true;
    showTyping();

    fetch(API_BASE + '/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: text, sessionId: sessionId }),
    })
    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
    .then(function (r) {
      removeTyping();
      if (!r.ok) {
        showToast(r.data.error || 'Something went wrong. Please try again.');
      } else {
        appendBotMessage(r.data.reply);
      }
    })
    .catch(function () {
      removeTyping();
      showToast('Network error. Please check your connection.');
    })
    .finally(function () {
      isLoading = false;
      if (btn) btn.disabled = false;
      if (ta)  { ta.disabled = false; if (isOpen) ta.focus(); }
    });
  }

  /* ── Clear ───────────────────────────────────────────────── */
  function clearChat() {
    fetch(API_BASE + '/api/clear', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId: sessionId }),
    }).catch(function () {});

    var msgs = document.getElementById('dmi-messages');
    if (msgs) msgs.innerHTML = '';
    appendBotMessage("Chat cleared! 👋 How can I help you with your insurance needs today?");
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    els = build();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}(window, document));
