export {};
type CompanyRecord = {
  slug: string;
  title: string;
  sector: string;
  description: string;
  english: string;
  website: string;
  logo: string;
  url: string;
  zhUrl: string;
  enUrl: string;
};
const root = document.querySelector<HTMLElement>('[data-company-browser]');
if (root) {
  const rail = root.querySelector<HTMLElement>('[data-company-nav]')!;
  const links = Array.from(
    rail.querySelectorAll<HTMLAnchorElement>('[data-company-link]'),
  );
  const records: CompanyRecord[] = JSON.parse(
    root.querySelector('[data-company-records]')!.textContent!,
  );
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = records.findIndex((c) => c.slug === root.dataset.currentCompany);
  let frame = 0;
  let programmatic = false;
  let initialized = false;
  const text = (selector: string, value: string) => {
    const el = root.querySelector(selector);
    if (el) el.textContent = value;
  };
  const select = (index: number, updateUrl = true) => {
    if (index < 0 || index >= records.length) return;
    const company = records[index];
    if (active !== index) {
      text('[data-company-title]', company.title);
      text('[data-company-sector]', company.sector);
      text('[data-company-description]', company.description);
      text('[data-company-english]', company.english);
      const logo = root.querySelector<HTMLImageElement>('.company-logo img')!;
      logo.src = company.logo;
      logo.alt = company.title;
      const wrapper = logo.parentElement!;
      wrapper.className = `company-logo company-logo--detail logo-${company.slug}`;
      const website = root.querySelector<HTMLAnchorElement>(
        '[data-company-website]',
      )!;
      website.hidden = !company.website;
      website.href = company.website;
      if (!reduced.matches)
        root.querySelector('.company-content')!.animate(
          [
            { opacity: 0.45, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 250, easing: 'ease-out' },
        );
    }
    active = index;
    root.dataset.currentCompany = company.slug;
    links.forEach((a, i) =>
      i === active
        ? a.setAttribute('aria-current', 'page')
        : a.removeAttribute('aria-current'),
    );
    if (updateUrl)
      history.replaceState({ company: company.slug }, '', company.url);
    document.title = `${company.title} · Link-X Capital`;
    document
      .querySelectorAll<HTMLAnchorElement>('[data-language]')
      .forEach(
        (a) =>
          (a.href =
            a.dataset.language === 'en' ? company.enUrl : company.zhUrl),
      );
    document.querySelector<HTMLLinkElement>('link[rel=canonical]')!.href =
      new URL(company.url, location.origin).href;
    document
      .querySelectorAll<HTMLLinkElement>('link[hreflang]')
      .forEach(
        (a) =>
          (a.href = new URL(
            a.hreflang === 'en' ? company.enUrl : company.zhUrl,
            location.origin,
          ).href),
      );
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    )!.content = document.title;
    document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    )!.content = location.href;
  };
  // Offset is measured from the real row centers. No absolute Figma y values
  // are mixed with scrollTop, so resizing and long names cannot shift selection.
  const center = (index: number) => {
    const a = links[index];
    const rr = rail.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    return (
      rail.scrollTop + r.top - rr.top + r.height / 2 - rail.clientHeight / 2
    );
  };
  const align = (index: number) => {
    programmatic = true;
    const track = rail.querySelector<HTMLElement>('.company-nav-track')!;
    track.style.paddingBlock = `${Math.max(0, (rail.clientHeight - links[0].offsetHeight) / 2)}px`;
    rail.scrollTo({ top: center(index), behavior: 'instant' });
    select(index);
    requestAnimationFrame(() => {
      programmatic = false;
      initialized = true;
      root.dataset.railReady = 'true';
      update();
    });
  };
  const update = () => {
    frame = 0;
    const rr = rail.getBoundingClientRect();
    let nearest = active,
      distance = Infinity;
    links.forEach((link, i) => {
      const box = link.getBoundingClientRect();
      const delta = box.top + box.height / 2 - rr.top - rail.clientHeight / 2;
      const ratio = Math.max(
        -1,
        Math.min(1, delta / (rail.clientHeight * 0.55)),
      );
      link.style.setProperty(
        '--rail-x',
        `${-Math.pow(ratio, 2) * Math.min(160, rail.clientWidth * 0.24)}px`,
      );
      link.style.setProperty(
        '--rail-opacity',
        String(1 - Math.abs(ratio) * 0.65),
      );
      if (Math.abs(delta) < distance) {
        distance = Math.abs(delta);
        nearest = i;
      }
    });
    if (initialized && !programmatic && nearest !== active) select(nearest);
  };
  rail.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  links.forEach((link, i) =>
    link.addEventListener('click', (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      align(i);
    }),
  );
  rail.addEventListener('keydown', (event) => {
    const target =
      event.key === 'ArrowDown'
        ? active + 1
        : event.key === 'ArrowUp'
          ? active - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? records.length - 1
              : -1;
    if (target >= 0 && target < records.length) {
      event.preventDefault();
      align(target);
    }
  });
  root
    .querySelector('[data-company-previous]')
    ?.addEventListener('click', () => align(Math.max(0, active - 1)));
  root
    .querySelector('[data-company-next]')
    ?.addEventListener('click', () =>
      align(Math.min(records.length - 1, active + 1)),
    );
  align(active);
  const resize = new ResizeObserver(() => align(active));
  resize.observe(rail);
  document.fonts.ready.then(() => align(active));
  window.addEventListener('popstate', () => {
    const i = records.findIndex((c) => location.pathname.endsWith(c.url));
    if (i >= 0) align(i);
  });
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    },
    { once: true },
  );
}
