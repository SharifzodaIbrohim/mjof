(() => {
  const $ = (s, r = document) => r.querySelector(s);

  function setTheme(mode) {
    document.body.classList.toggle('dark-theme', mode === 'dark');
    localStorage.setItem('mjof_theme', mode);
  }
  if (localStorage.getItem('mjof_theme') === 'dark' || localStorage.getItem('geo_theme') === 'dark') {
    setTheme('dark');
  }

  $('#pfTheme')?.addEventListener('click', () => {
    setTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark');
  });

  const drawer = $('#pfNotifDrawer');
  $('#pfNotif')?.addEventListener('click', (e) => {
    e.stopPropagation();
    drawer?.classList.toggle('hidden');
  });
  document.addEventListener('click', () => drawer?.classList.add('hidden'));

  document.querySelectorAll('.pf-nav a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c])
    );
  }

  async function loadHomeData() {
    try {
      const oly = await fetch('/api/olympiads/active').then((r) => r.json()).catch(() => ({ olympiads: [] }));
      const oBox = $('#pfUpcomingBox');
      if (oBox) {
        const list = (oly.olympiads || []).slice(0, 4);
        if (list.length) {
          oBox.innerHTML = list
            .map(
              (o) => `<div class="pf-act">
                <div class="pf-act-main"><strong>${esc(o.title)}</strong>
                <div class="pf-act-meta">${o.questionCount || 0} савол</div></div>
              </div>`
            )
            .join('');
        }
      }
      const so = $('#pfMOlympiads');
      if (so) so.textContent = String((oly.olympiads || []).length || '—');
    } catch (e) {
      console.warn(e);
    }
  }

  loadHomeData();
})();
