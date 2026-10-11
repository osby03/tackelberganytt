// Tackelberganytt: kommentarer, reaktioner och delning via mobilen.
async function initEngagement() {
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) return;

  const status = document.getElementById('engagementStatus');
  const commentsRoot = document.getElementById('articleComments');
  const reactionButtons = document.getElementById('engagementReactions');
  const reactionSummary = document.getElementById('reactionSummary');
  const toggle = document.getElementById('reactionToggle');
  const picker = document.getElementById('reactionPicker');
  const types = [
    ['laugh', '😂', 'Skratt'], ['cry', '😭', 'Gråt'],
    ['heart', '❤️', 'Hjärta'], ['fire', '🔥', 'Eld'], ['poop', '💩', 'Bajs']
  ];
  const endpoint = '/.netlify/functions/article-community?slug=' + encodeURIComponent(slug);
  const storageKey = 'tb-community-device';
  let device;
  try {
    device = localStorage.getItem(storageKey);
    if (!device) {
      device = crypto.randomUUID();
      localStorage.setItem(storageKey, device);
    }
  } catch {
    device = crypto.randomUUID();
  }
  const escape = value => {
    const el = document.createElement('div');
    el.textContent = String(value ?? '');
    return el.innerHTML;
  };
  async function request(query = '', options = {}) {
    const response = await fetch(endpoint + query, {cache: 'no-store', ...options});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(payload.error || 'Något gick fel.');
    return payload;
  }
  function renderReactions(data) {
    reactionSummary.replaceChildren();
    reactionButtons.replaceChildren();
    let total = 0;
    for (const [key, emoji, label] of types) {
      const count = Number(data.reactions?.[key] || 0);
      total += count;
      // Alla artikelns reaktioner visas, även innan man öppnar väljaren.
      if (count > 0) {
        const chip = document.createElement('span');
        chip.className = 'reaction-summary-chip';
        chip.textContent = emoji + ' ' + count;
        chip.title = label + ': ' + count;
        reactionSummary.append(chip);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reaction-button';
      button.textContent = emoji;
      button.title = label + (count ? ' (' + count + ')' : '');
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(data.myReaction === key));
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await request('&action=react', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reaction: data.myReaction === key ? null : key, device})
          });
          picker.hidden = true;
          toggle.setAttribute('aria-expanded', 'false');
          await refresh();
        } catch (error) {
          status.textContent = error.message;
        } finally { button.disabled = false; }
      });
      reactionButtons.append(button);
    }
    if (!total) {
      const empty = document.createElement('span');
      empty.className = 'engagement-muted';
      empty.textContent = 'Inga reaktioner ännu';
      reactionSummary.append(empty);
    }
    toggle.classList.toggle('has-reacted', Boolean(data.myReaction));
  }
  async function refresh() {
    try {
      const data = await request('&device=' + encodeURIComponent(device));
      renderReactions(data);
      commentsRoot.replaceChildren();
      document.getElementById('articleCommentCount').textContent = '(' + data.comments.length + ')';
      if (!data.comments.length) {
        const empty = document.createElement('p');
        empty.className = 'engagement-muted';
        empty.textContent = 'Bli först att kommentera.';
        commentsRoot.append(empty);
      }
      for (const c of data.comments) {
        const item = document.createElement('article');
        item.className = 'engagement-comment';
        const date = new Date(c.createdAt);
        item.innerHTML = '<div><strong>' + escape(c.name) + '</strong><time>' + (Number.isNaN(date.getTime()) ? '' : escape(date.toLocaleString('sv-SE', {dateStyle:'medium',timeStyle:'short'}))) + '</time></div><p>' + escape(c.comment) + '</p>';
        commentsRoot.append(item);
      }
      status.textContent = '';
    } catch (error) {
      status.textContent = 'Kommentarer och reaktioner kunde inte laddas: ' + error.message;
    }
  }
  toggle.addEventListener('click', () => {
    picker.hidden = !picker.hidden;
    toggle.setAttribute('aria-expanded', String(!picker.hidden));
  });
  document.addEventListener('click', event => {
    if (!picker.hidden && !picker.contains(event.target) && !toggle.contains(event.target)) {
      picker.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.getElementById('articleCommentForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Publicerar…';
    try {
      await request('&action=comment', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          name: document.getElementById('commentName').value,
          comment: document.getElementById('commentBody').value,
          website: document.getElementById('commentWebsite').value
        })
      });
      form.reset();
      await refresh();
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  const share = document.getElementById('shareNative');
  share.addEventListener('click', async () => {
    if (!window.matchMedia('(max-width: 700px)').matches) return;
    if (navigator.share) {
      try { await navigator.share({title: document.title, url: location.href}); }
      catch (error) { if (error.name !== 'AbortError') status.textContent = 'Kunde inte dela artikeln.'; }
    } else {
      // Fallback: på telefoner utan inbyggt delningsstöd kopieras länken.
      try {
        await navigator.clipboard.writeText(location.href);
        status.textContent = 'Artikellänken har kopierats.';
      } catch { status.textContent = 'Kopiera länken från adressfältet.'; }
    }
  });
  await refresh();
}
