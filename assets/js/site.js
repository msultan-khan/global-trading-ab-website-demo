/* Global Trading AB: website demo interactions. No dependencies. */
(function () {
	'use strict';
	var d = document, w = window;
	d.documentElement.classList.remove('no-js');
	var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var ROOT = d.body.getAttribute('data-root') || './';
	function $(s, c) { return (c || d).querySelector(s); }
	function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
	function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
	var mem = {};
	function get(k) { var v = store(k); return v === null || v === undefined ? mem[k] : v; }
	function set(k, v) { mem[k] = v; store(k, v); }

	/* ---------------------------------------------------------- Header */
	var header = $('.site-header');
	function onScroll() { if (header) header.classList.toggle('is-scrolled', w.scrollY > 8); }
	w.addEventListener('scroll', onScroll, { passive: true }); onScroll();

	$$('.nav__item').forEach(function (item) {
		var btn = $('.nav__toggle', item);
		if (!btn) return;
		function open(v) { item.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
		btn.addEventListener('click', function (e) { e.stopPropagation(); open(!item.classList.contains('is-open')); });
		item.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); btn.focus(); } });
		item.addEventListener('focusout', function (e) { if (!item.contains(e.relatedTarget)) open(false); });
		d.addEventListener('click', function (e) { if (!item.contains(e.target)) open(false); });
	});

	/* ---------------------------------------------------------- Overlays (mobile menu, drawer) */
	var lastFocus = null;
	function trap(el, e) {
		if (e.key !== 'Tab') return;
		var f = $$('a[href], button:not([disabled]), input, select, textarea', el).filter(function (x) { return x.offsetParent !== null; });
		if (!f.length) return;
		if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
		else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
	}
	function overlay(el, opener, scrim) {
		function open() { lastFocus = d.activeElement; el.classList.add('is-open'); el.removeAttribute('inert'); el.setAttribute('aria-hidden', 'false'); if (scrim) scrim.classList.add('is-open'); d.body.classList.add('is-locked'); $$('[data-open="' + el.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); }); var f = $('[data-autofocus]', el) || $('button, a', el); if (f) setTimeout(function () { f.focus(); }, 60); }
		function close() { el.classList.remove('is-open'); el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); if (scrim) scrim.classList.remove('is-open'); d.body.classList.remove('is-locked'); $$('[data-open="' + el.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); if (lastFocus) lastFocus.focus(); }
		$$('[data-open="' + el.id + '"]').forEach(function (b) { b.addEventListener('click', open); });
		$$('[data-close]', el).forEach(function (b) { b.addEventListener('click', close); });
		if (scrim) scrim.addEventListener('click', close);
		el.addEventListener('keydown', function (e) { trap(el, e); });
		d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el.classList.contains('is-open')) close(); });
		$$('a[href^="#"], a[data-closes]', el).forEach(function (a) { a.addEventListener('click', function () { close(); }); });
		el.setAttribute('inert', '');
		return { open: open, close: close };
	}
	var menu = $('#mobile-menu'); if (menu) overlay(menu);
	var drawerEl = $('#inquiry-drawer'); var drawer = drawerEl ? overlay(drawerEl, null, $('.drawer-scrim')) : null;

	/* ---------------------------------------------------------- Inquiry list */
	var KEY = 'gtab-demo-inquiry';
	function list() { return get(KEY) || []; }
	function has(id) { return list().some(function (x) { return x.id === id; }); }
	function save(l) { set(KEY, l); render(); }
	function add(item) { if (!has(item.id)) save(list().concat([item])); }
	function remove(id) { save(list().filter(function (x) { return x.id !== id; })); }
	function toggle(item) { if (has(item.id)) { remove(item.id); toast(item.name + ' removed from your inquiry list'); } else { add(item); toast(item.name + ' added to your inquiry list', true); bump(); } }
	function bump() { $$('.basket-btn').forEach(function (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); setTimeout(function () { b.classList.remove('bump'); }, 300); }); }
	function render() {
		var l = list();
		$$('.basket-btn').forEach(function (b) { b.classList.toggle('has-items', l.length > 0); $('.basket-btn__count', b).textContent = l.length; });
		$$('[data-add-id]').forEach(function (b) { var on = has(b.getAttribute('data-add-id')); b.setAttribute('aria-pressed', on ? 'true' : 'false'); var lbl = $('.lbl', b); if (lbl) lbl.textContent = on ? (b.getAttribute('data-added') || 'Added') : (b.getAttribute('data-label') || 'Add to inquiry'); if (!lbl) { var name = b.getAttribute('data-add-name'); b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + name + (on ? ' from' : ' to') + ' inquiry list'); } });
		var ul = $('#basket-list'), empty = $('#basket-empty'), foot = $('#basket-foot');
		if (ul) {
			ul.innerHTML = l.map(function (x) { return '<li><div><span>' + esc(x.name) + '</span><small>' + esc(x.cat || '') + (x.note ? ' · ' + esc(x.note) : '') + '</small></div><button class="icon-btn" type="button" data-remove="' + esc(x.id) + '" aria-label="Remove ' + esc(x.name) + '"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></li>'; }).join('');
			empty.hidden = l.length > 0; ul.hidden = l.length === 0; foot.hidden = l.length === 0;
		}
		d.dispatchEvent(new CustomEvent('inquiry:change'));
	}
	d.addEventListener('click', function (e) {
		var b = e.target.closest('[data-add-id]');
		if (b) { e.preventDefault(); toggle({ id: b.getAttribute('data-add-id'), name: b.getAttribute('data-add-name'), cat: b.getAttribute('data-add-cat') || '', note: b.getAttribute('data-add-note') || '' }); return; }
		var r = e.target.closest('[data-remove]');
		if (r) {
			var li = r.closest('li'), sib = li && (li.nextElementSibling || li.previousElementSibling), sibId = sib && $('[data-remove]', sib) ? $('[data-remove]', sib).getAttribute('data-remove') : null;
			remove(r.getAttribute('data-remove'));
			var target = sibId ? $('[data-remove="' + sibId + '"]') : $('#inquiry-drawer [data-close]');
			if (target && drawerEl && drawerEl.classList.contains('is-open')) target.focus();
		}
		if (e.target.closest('[data-clear-list]')) { save([]); }
	});

	var toastEl, toastT;
	function toast(msg, withLink) {
		if (!toastEl) { toastEl = d.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); d.body.appendChild(toastEl); }
		toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (withLink && drawer ? '<button type="button">View list</button>' : '');
		var b = $('button', toastEl); if (b) b.addEventListener('click', function () { toastEl.classList.remove('is-on'); drawer.open(); });
		toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
	}
	w.GT = { add: add, remove: remove, has: has, list: list, save: save, toast: toast, render: render };

	/* ---------------------------------------------------------- Reveal */
	var revs = $$('.reveal, .reveal-stagger, .steps-band');
	if ('IntersectionObserver' in w && !reduce) {
		var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
		revs.forEach(function (el) { io.observe(el); });
	} else { revs.forEach(function (el) { el.classList.add('is-in'); }); }

	/* ---------------------------------------------------------- Rotator */
	$$('.rotator').forEach(function (r) {
		var items = $$('span', r), i = 0;
		if (reduce || items.length < 2) return;
		setInterval(function () { items[i].classList.remove('is-on'); items[i].setAttribute('aria-hidden', 'true'); i = (i + 1) % items.length; items[i].classList.add('is-on'); items[i].removeAttribute('aria-hidden'); }, 2400);
	});

	/* ---------------------------------------------------------- Origins map */
	$$('[data-map]').forEach(function (m) {
		var pins = $$('.pin', m), info = $(m.getAttribute('data-map'));
		function pick(p) {
			pins.forEach(function (x) { x.setAttribute('aria-pressed', x === p ? 'true' : 'false'); });
			if (!info) return;
			$('.k', info).textContent = p.getAttribute('data-kind');
			$('h3', info).textContent = p.getAttribute('data-label');
			$('p', info).textContent = p.getAttribute('data-text');
			info.classList.remove('fade-swap'); void info.offsetWidth; info.classList.add('fade-swap');
		}
		pins.forEach(function (p) { p.addEventListener('click', function () { pick(p); }); });
	});

	/* ---------------------------------------------------------- Segmented tabs (Kabuli/Desi) */
	$$('[data-seg]').forEach(function (seg) {
		var tabs = $$('[role="tab"]', seg);
		function sel(t, focus) { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; var p = d.getElementById(x.getAttribute('aria-controls')); if (p) { p.hidden = !on; if (on) { p.classList.remove('fade-swap'); void p.offsetWidth; p.classList.add('fade-swap'); } } }); if (focus) t.focus(); }
		tabs.forEach(function (t, i) {
			t.addEventListener('click', function () { sel(t); });
			t.addEventListener('keydown', function (e) { var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (n) { e.preventDefault(); sel(tabs[(i + n + tabs.length) % tabs.length], true); } });
		});
	});

	/* ---------------------------------------------------------- Size selector */
	$$('[data-sizes]').forEach(function (box) {
		var btns = $$('button', box), figs = $$('figure', d.getElementById(box.getAttribute('data-sizes')));
		btns.forEach(function (b, i) { b.addEventListener('click', function () { btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); figs.forEach(function (f, j) { f.classList.toggle('is-on', j === i); }); var q = $('[data-size-quote]'); if (q) { q.href = q.getAttribute('data-base') + '&size=' + encodeURIComponent(b.textContent.trim()) + '#inquiry'; } }); });
	});

	/* ---------------------------------------------------------- Range filter (Pulses page) */
	$$('[data-range]').forEach(function (wrap) {
		var pills = $$('.pill', wrap), input = $('input[type="search"]', wrap), rows = $$('[data-row]'), groups = $$('[data-group-block]'), count = $('[data-range-count]'), empty = $('[data-range-empty]');
		var g = 'all';
		function apply() {
			var q = (input ? input.value : '').trim().toLowerCase(), n = 0;
			rows.forEach(function (r) { var ok = (g === 'all' || r.getAttribute('data-group') === g) && (!q || r.textContent.toLowerCase().indexOf(q) > -1); r.hidden = !ok; if (ok) n++; });
			groups.forEach(function (b) { b.hidden = !$$('[data-row]', b).some(function (r) { return !r.hidden; }); });
			if (count) count.textContent = n + (n === 1 ? ' product line' : ' product lines');
			if (empty) empty.hidden = n > 0;
		}
		pills.forEach(function (p) { p.addEventListener('click', function () { g = p.getAttribute('data-filter'); pills.forEach(function (x) { x.setAttribute('aria-pressed', x === p ? 'true' : 'false'); }); apply(); }); });
		if (input) input.addEventListener('input', apply);
		apply();
	});

	/* ---------------------------------------------------------- Spec builder (Paper, Plastic, Electronics) */
	$$('[data-spec]').forEach(function (box) {
		var cbs = $$('input[type="checkbox"]', box), bar = $('.spec-meter__bar i', box.parentNode), out = $('.spec-meter output', box.parentNode), btn = $('[data-spec-add]', box.parentNode);
		function upd() {
			var on = cbs.filter(function (c) { return c.checked; }), pct = Math.round(on.length / cbs.length * 100);
			if (bar) bar.style.width = pct + '%'; if (out) out.textContent = on.length + ' of ' + cbs.length;
			if (btn) { btn.setAttribute('data-add-note', on.length ? on.length + ' of ' + cbs.length + ' details ready' : ''); }
		}
		cbs.forEach(function (c) { c.addEventListener('change', upd); }); upd();
	});

	/* ---------------------------------------------------------- Product explorer */
	var ex = $('[data-explorer]');
	if (ex && w.GT_PRODUCTS) {
		var DATA = w.GT_PRODUCTS, state = { cat: ex.getAttribute('data-start') || 'pulses', group: 'all', sel: null, q: '' };
		var tabsEl = $('.tabs', ex), listEl = $('[data-plist]', ex), detailEl = $('[data-detail]', ex), filtEl = $('[data-filters]', ex), briefEl = $('[data-brief]', ex), searchEl = $('[data-psearch]', ex);
		tabsEl.innerHTML = Object.keys(DATA).map(function (k) { return '<button class="tab" role="tab" type="button" id="tab-' + k + '" data-cat="' + k + '" aria-selected="false"><strong>' + esc(DATA[k].label) + '</strong><span>' + esc(DATA[k].sub) + '</span></button>'; }).join('');
		function addBtn(id, name, cat, label, cls, compact) { return '<button type="button" class="add-btn ' + (cls || '') + '" data-add-id="' + esc(id) + '" data-add-name="' + esc(name) + '" data-add-cat="' + esc(cat) + '" data-label="' + esc(label || 'Add to inquiry') + '" data-added="Added to inquiry" aria-pressed="false"' + (compact ? ' aria-label="Add ' + esc(name) + ' to inquiry list"' : '') + '><svg class="ic-plus" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><svg class="ic-check" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>' + (compact ? '' : '<span class="lbl">' + esc(label || 'Add to inquiry') + '</span><span class="sr-only">: ' + esc(name) + '</span>') + '</button>'; }
		function draw() {
			var c = DATA[state.cat];
			$$('.tab', tabsEl).forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-cat') === state.cat ? 'true' : 'false'); });
			var hasP = !!c.products;
			filtEl.hidden = !hasP; listEl.parentNode.hidden = !hasP; briefEl.hidden = hasP;
			if (hasP) {
				var groups = c.groups || [];
				$('[data-gpills]', filtEl).innerHTML = groups.length ? [['all', 'All']].concat(groups).map(function (g) { return '<button type="button" class="pill" data-g="' + g[0] + '" aria-pressed="' + (state.group === g[0]) + '">' + esc(g[1]) + '</button>'; }).join('') : '';
				var q = state.q.toLowerCase();
				var items = c.products.filter(function (p) { return (state.group === 'all' || p.g === state.group) && (!q || (p.name + ' ' + p.detail).toLowerCase().indexOf(q) > -1); });
				if (!state.sel || !c.products.some(function (p) { return p.id === state.sel; })) state.sel = c.products[0].id;
				listEl.innerHTML = items.length ? items.map(function (p) { return '<div class="prow' + (p.id === state.sel ? ' is-sel' : '') + '"><button type="button" class="prow__main" data-sel="' + p.id + '" aria-pressed="' + (p.id === state.sel) + '"><i class="prow__sw" style="background:' + (p.img ? 'url(' + ROOT + 'assets/img/' + p.img + ') center / cover' : p.sw) + '"></i><span class="prow__txt"><strong>' + esc(p.name) + '</strong><span>' + esc(p.detail) + '</span></span></button>' + addBtn(p.id, p.name, c.label, '', '', true) + '</div>'; }).join('') : '<p class="plist__empty">No products match. Try another word, or <a href="' + ROOT + 'contact-us/index.html?category=other#inquiry">ask us directly</a>.</p>';
				var p = c.products.filter(function (x) { return x.id === state.sel; })[0];
				detailEl.innerHTML = '<div class="detail__media" style="background-image:' + (p.img ? 'url(' + ROOT + 'assets/img/' + p.img + ')' : 'linear-gradient(140deg,' + p.sw + ',#0D1A14)') + '"></div><div class="detail__body"><span class="k">' + esc(p.kicker) + '</span><h3>' + esc(p.name) + '</h3><p>' + esc(p.text) + '</p><dl>' + p.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl><div class="btns">' + addBtn(p.id, p.name, c.label) + (p.url ? '<a class="btn btn--ghost-light btn--sm" href="' + ROOT + p.url + '">Product page</a>' : '') + '</div></div>';
				detailEl.classList.remove('fade-swap'); void detailEl.offsetWidth; detailEl.classList.add('fade-swap');
			} else {
				var b = c.brief;
				briefEl.innerHTML = '<span class="eyebrow">' + esc(c.label) + '</span><h3>' + esc(b.title) + '</h3><p class="ink2">' + esc(b.text) + '</p><ul>' + b.fields.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul><div class="btns mt-0">' + addBtn(b.id, b.name, c.label, b.button).replace('add-btn', 'add-btn') + '<a class="btn btn--outline btn--sm" href="' + ROOT + b.url + '">' + esc(b.more) + '</a></div>';
				briefEl.classList.remove('fade-swap'); void briefEl.offsetWidth; briefEl.classList.add('fade-swap');
			}
			render();
		}
		tabsEl.addEventListener('click', function (e) { var t = e.target.closest('.tab'); if (!t) return; state.cat = t.getAttribute('data-cat'); state.group = 'all'; state.sel = null; state.q = ''; if (searchEl) searchEl.value = ''; draw(); });
		tabsEl.addEventListener('keydown', function (e) { var tabs = $$('.tab', tabsEl), i = tabs.indexOf(d.activeElement), n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (n && i > -1) { e.preventDefault(); var t = tabs[(i + n + tabs.length) % tabs.length]; t.focus(); t.click(); } });
		filtEl.addEventListener('click', function (e) { var p = e.target.closest('.pill'); if (!p) return; state.group = p.getAttribute('data-g'); draw(); });
		if (searchEl) searchEl.addEventListener('input', function () { state.q = searchEl.value; draw(); });
		listEl.addEventListener('click', function (e) { var s = e.target.closest('[data-sel]'); if (!s) return; state.sel = s.getAttribute('data-sel'); draw(); var nb = $('[data-sel="' + state.sel + '"]', listEl); if (nb) nb.focus(); if (w.innerWidth < 980) detailEl.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); });
		var hash = (location.hash || '').replace('#', ''); if (DATA[hash]) state.cat = hash;
		draw();
	}

	/* ---------------------------------------------------------- Quote form */
	var form = $('#quote-form');
	if (form) {
		var steps = $$('fieldset', form), cur = 0, stepLis = $$('.quote__steps li'), bar = $('.quote__bar i'), prev = $('[data-prev]', form), next = $('[data-next]', form), errBox = $('.form-error', form);
		var params = new URLSearchParams(location.search);
		var catMap = { chickpeas: 'Chickpeas', pulses: 'Pulses, grains and seeds', 'global-oil': 'Global Oil (cooking oils)', paper: 'Paper', plastic: 'Plastic', electronics: 'Consumer electronics', other: 'Other or not sure' };
		var preCat = catMap[params.get('category')];
		if (preCat) { var cb = $('input[name="category"][value="' + preCat + '"]', form); if (cb) cb.checked = true; }
		if (params.get('size')) { var spec = $('#q-spec'); if (spec && !spec.value) spec.value = 'Kabuli chickpeas, ' + params.get('size'); }
		function syncFromList() {
			var l = list(), box = $('[data-q-list]', form);
			if (!box) return;
			box.innerHTML = l.length ? '<p class="small muted mb-0">From your inquiry list:</p><div class="kv mt-1">' + l.map(function (x) { return '<span class="chip chip--light">' + esc(x.name) + '</span>'; }).join('') + '</div>' : '';
			var catFor = { 'Pulses, grains and seeds': 'Pulses, grains and seeds', 'Chickpeas': 'Chickpeas', 'Global Oil': 'Global Oil (cooking oils)', 'Paper': 'Paper', 'Plastic': 'Plastic', 'Consumer Electronics': 'Consumer electronics' };
			l.forEach(function (x) { var v = /chickpea/i.test(x.name) ? 'Chickpeas' : catFor[x.cat]; if (v) { var c = $('input[name="category"][value="' + v + '"]', form); if (c) c.checked = true; } });
		}
		d.addEventListener('inquiry:change', syncFromList); syncFromList();
		function show(i, noFocus) {
			cur = i;
			steps.forEach(function (f, j) { f.hidden = j !== i; });
			stepLis.forEach(function (li, j) { li.classList.toggle('is-active', j === i); li.classList.toggle('is-done', j < i); $('i', li).textContent = j < i ? '✓' : String(j + 1); if (j === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
			bar.style.width = ((i + 1) / steps.length * 100) + '%';
			prev.hidden = i === 0;
			next.innerHTML = i === steps.length - 1 ? 'Send inquiry <span class="arr" aria-hidden="true">→</span>' : 'Continue <span class="arr" aria-hidden="true">→</span>';
			errBox.classList.remove('is-on');
			if (i === steps.length - 1) summary();
			var lg = $('legend', steps[i]); if (lg && !noFocus) { lg.setAttribute('tabindex', '-1'); lg.focus({ preventScroll: true }); }
		}
		function fieldErr(el, on) { var f = el.closest('.field'); if (f) f.classList.toggle('has-error', on); el.setAttribute('aria-invalid', on ? 'true' : 'false'); }
		function validate(i) {
			var ok = true, first = null;
			if (i === 0) {
				var any = $$('input[name="category"]', form).some(function (c) { return c.checked; });
				if (!any) { ok = false; errBox.textContent = 'Choose at least one category so we can route your inquiry.'; errBox.classList.add('is-on'); first = $('input[name="category"]', form); }
			}
			$$('[required]', steps[i]).forEach(function (el) {
				var bad = !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
				fieldErr(el, bad); if (bad) { ok = false; if (!first) first = el; }
			});
			if (!ok && i > 0) { errBox.textContent = 'Please check the highlighted fields.'; errBox.classList.add('is-on'); }
			if (first) first.focus();
			return ok;
		}
		function val(id) { var e = d.getElementById(id); return e && e.value.trim() ? e.value.trim() : '—'; }
		function summary() {
			var cats = $$('input[name="category"]:checked', form).map(function (c) { return c.value; }).join(', ') || '—';
			var items = list().map(function (x) { return x.name; }).join(', ');
			var rows = [['Categories', cats]]; if (items) rows.push(['Products', items]);
			rows = rows.concat([['Specification', val('q-spec')], ['Quantity', val('q-qty')], ['Destination', val('q-dest')], ['Shipment window', val('q-timing')]]);
			$('[data-summary]', form).innerHTML = '<dl>' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
		}
		$$('input, select, textarea', form).forEach(function (el) { el.addEventListener('input', function () { if (el.closest('.has-error')) fieldErr(el, false); }); });
		prev.addEventListener('click', function () { show(Math.max(0, cur - 1)); });
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			if (!validate(cur)) return;
			if (cur < steps.length - 1) { show(cur + 1); return; }
			var routeTo = $$('input[name="category"]:checked', form).some(function (c) { return c.value === 'Consumer electronics'; }) ? 'zulki@globerec.com' : 'info@globerec.com';
			var name = val('q-name');
			$('.quote').innerHTML = '<div class="success" role="status" tabindex="-1"><div class="success__icon"><svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#14532D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 style="font-size:var(--fs-card)">Thank you, ' + esc(name.split(' ')[0]) + '.</h2><p class="ink2 measure" style="margin-inline:auto">Your inquiry would now go to <strong>' + esc(routeTo) + '</strong>. We reply by email with what we can offer, any questions we have, or a plain answer if it is not something we can help with.</p><p class="demo-note">Demo only: nothing has been sent.</p><div class="btns" style="justify-content:center"><a class="btn btn--outline" href="' + ROOT + 'index.html">Back to home</a><a class="btn" href="' + ROOT + 'contact-us/index.html#inquiry">Start another inquiry</a></div></div>';
			save([]);
			var s = $('.success'); if (s) s.focus();
		});
		show(0, true);
	}

	/* ---------------------------------------------------------- Review mode (confirm markers) */
	var marks = $$('.confirm'), rb = $('.review-bar');
	if (rb) {
		if (!marks.length) { rb.hidden = true; } else {
			$('b', rb).textContent = marks.length;
			var sw = $('.switch', rb), on = get('gtab-demo-review'); on = on === null || on === undefined ? true : on;
			function applyRev(v) { d.body.classList.toggle('hide-confirm', !v); sw.setAttribute('aria-checked', v ? 'true' : 'false'); set('gtab-demo-review', v); }
			sw.addEventListener('click', function () { applyRev(sw.getAttribute('aria-checked') !== 'true'); });
			applyRev(on);
		}
	}

	/* ---------------------------------------------------------- TOC highlighting (legal pages) */
	var toc = $$('.toc a');
	if (toc.length && 'IntersectionObserver' in w) {
		var tio = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { toc.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id); }); } }); }, { rootMargin: '-20% 0px -70% 0px' });
		toc.forEach(function (a) { var t = d.getElementById(a.getAttribute('href').slice(1)); if (t) tio.observe(t); });
	}

	render();
})();
