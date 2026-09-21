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
  const track = rail.querySelector<HTMLElement>('.company-nav-track')!;
  const links = Array.from(
    rail.querySelectorAll<HTMLAnchorElement>('[data-company-link]'),
  );
  const continuation = root.querySelector<HTMLElement>(
    '[data-company-arc-continuation]',
  );
  const topDots = Array.from(
    continuation?.querySelectorAll<HTMLElement>('[data-arc-side="top"]') ?? [],
  );
  const bottomDots = Array.from(
    continuation?.querySelectorAll<HTMLElement>('[data-arc-side="bottom"]') ??
      [],
  );
  const records: CompanyRecord[] = JSON.parse(
    root.querySelector('[data-company-records]')!.textContent!,
  );
  links.forEach((link, index) => {
    link.dataset.companyIndex = String(index);
  });
  const compactRail = matchMedia('(max-width: 767px)');
  const cloneCycle = () =>
    links.map((link, index) => {
      const clone = link.cloneNode(true) as HTMLAnchorElement;
      clone.removeAttribute('data-company-link');
      clone.dataset.companyLoopLink = link.dataset.companyLink!;
      clone.dataset.companyIndex = String(index);
      clone.setAttribute('aria-hidden', 'true');
      clone.tabIndex = -1;
      clone.removeAttribute('aria-current');
      return clone;
    });
  // The desktop/tablet treatment is an intentionally continuous circular
  // rail. On phones the same cloned, vertical rail is unnecessarily heavy
  // and difficult to operate, so the original links become a native
  // horizontal, tap-to-select list instead.
  if (!compactRail.matches) {
    track.prepend(...cloneCycle());
    track.append(...cloneCycle());
  }
  const rows = Array.from(
    track.querySelectorAll<HTMLAnchorElement>('a[data-company-index]'),
  );
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = records.findIndex((c) => c.slug === root.dataset.currentCompany);
  let frame = 0;
  let programmatic = false;
  let initialized = false;
  const desktopRail = matchMedia('(min-width: 1024px)');
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
    rows.forEach((row) => {
      if (Number(row.dataset.companyIndex) === active)
        row.setAttribute('aria-current', 'page');
      else row.removeAttribute('aria-current');
    });
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
  const centerRow = (row: HTMLAnchorElement) => {
    const rr = rail.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    return (
      rail.scrollTop + r.top - rr.top + r.height / 2 - rail.clientHeight / 2
    );
  };
  const closestRow = (index: number, preferOriginal = false) => {
    if (preferOriginal) return links[index];
    return rows
      .filter((row) => Number(row.dataset.companyIndex) === index)
      .reduce((closest, row) =>
        Math.abs(centerRow(row) - rail.scrollTop) <
        Math.abs(centerRow(closest) - rail.scrollTop)
          ? row
          : closest,
      );
  };
  const align = (index: number, preferOriginal = false) => {
    programmatic = true;
    if (compactRail.matches) {
      const link = links[index];
      select(index);
      rail.scrollTo({
        left: Math.max(
          0,
          link.offsetLeft + link.offsetWidth / 2 - rail.clientWidth / 2,
        ),
        behavior: initialized && !reduced.matches ? 'smooth' : 'auto',
      });
      requestAnimationFrame(() => {
        programmatic = false;
        initialized = true;
        root.dataset.railReady = 'true';
      });
      return;
    }
    track.style.paddingBlock = `${Math.max(0, (rail.clientHeight - links[0].offsetHeight) / 2)}px`;
    rail.scrollTo({
      top: centerRow(closestRow(index, preferOriginal)),
      behavior: 'instant',
    });
    select(index);
    requestAnimationFrame(() => {
      programmatic = false;
      initialized = true;
      root.dataset.railReady = 'true';
      update();
    });
  };
  const normalizeLoopPosition = () => {
    if (compactRail.matches) return;
    if (rows.length < records.length * 3) return;
    const first = rows[records.length];
    const second = rows[records.length + 1] ?? first;
    const nextFirst = rows[records.length * 2];
    const rowStep = Math.max(1, centerRow(second) - centerRow(first));
    const cycleHeight = centerRow(nextFirst) - centerRow(first);
    if (cycleHeight <= 0) return;
    const lowerBound = centerRow(first) - rowStep / 2;
    const upperBound = lowerBound + cycleHeight;
    let nextTop = rail.scrollTop;
    while (nextTop < lowerBound) nextTop += cycleHeight;
    while (nextTop >= upperBound) nextTop -= cycleHeight;
    if (Math.abs(nextTop - rail.scrollTop) > 0.5) rail.scrollTop = nextTop;
  };
  const update = () => {
    frame = 0;
    if (compactRail.matches) return;
    normalizeLoopPosition();
    const rr = rail.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const orbit = root.querySelector<HTMLImageElement>('.company-orbit');
    const orbitRect = orbit?.getBoundingClientRect();
    // The Figma asset is a 1187px export around a 1130px circle. The
    // navigation markers use that exact circle instead of approximating a
    // second curve, so the crisp interactive points sit on the blurred orbit.
    const orbitCenterX = orbitRect
      ? orbitRect.left + orbitRect.width / 2
      : rootRect.left + rootRect.width * (859 / 1920);
    const orbitCenterY = orbitRect
      ? orbitRect.top + orbitRect.height / 2
      : rootRect.top + rootRect.height / 2;
    const orbitRadius = orbitRect
      ? orbitRect.width * (565 / 1187)
      : rootRect.width * (565 / 1920);
    const markerBaseX = rr.left + rail.clientWidth * 0.32 + 26;
    let nearest = active,
      distance = Infinity;
    rows.forEach((link) => {
      const box = link.getBoundingClientRect();
      const delta = box.top + box.height / 2 - rr.top - rail.clientHeight / 2;
      const ratio = Math.max(
        -1,
        Math.min(1, delta / (rail.clientHeight * 0.55)),
      );
      const rowCenterY = box.top + box.height / 2;
      const circleDeltaY = rowCenterY - orbitCenterY;
      const circleX =
        orbitCenterX +
        Math.sqrt(
          Math.max(0, orbitRadius * orbitRadius - circleDeltaY * circleDeltaY),
        );
      const railX = desktopRail.matches
        ? circleX - markerBaseX
        : -Math.pow(ratio, 2) * Math.min(160, rail.clientWidth * 0.24);
      link.style.setProperty('--rail-x', `${railX}px`);
      link.style.setProperty(
        '--rail-opacity',
        String(1 - Math.abs(ratio) * 0.65),
      );
      const edgeFade = Math.max(
        0,
        Math.min(1, (Math.abs(ratio) - 0.46) / 0.54),
      );
      link.style.setProperty(
        '--rail-blur',
        desktopRail.matches ? `${edgeFade * 3.2}px` : '0px',
      );
      if (Math.abs(delta) < distance) {
        distance = Math.abs(delta);
        nearest = Number(link.dataset.companyIndex);
      }
    });
    // Real cloned rows now continue through both edges. The old dot-only
    // fallback must stay hidden or it would create a second overlapping arc.
    [...topDots, ...bottomDots].forEach((dot) =>
      dot.style.setProperty('--arc-dot-opacity', '0'),
    );
    if (initialized && !programmatic && nearest !== active) select(nearest);
  };
  rail.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  rows.forEach((link) =>
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
      align(Number(link.dataset.companyIndex));
    }),
  );
  rail.addEventListener('keydown', (event) => {
    const target =
      event.key === 'ArrowDown' ||
      (compactRail.matches && event.key === 'ArrowRight')
        ? (active + 1) % records.length
        : event.key === 'ArrowUp' ||
            (compactRail.matches && event.key === 'ArrowLeft')
          ? (active - 1 + records.length) % records.length
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
    ?.addEventListener('click', () =>
      align((active - 1 + records.length) % records.length),
    );
  root
    .querySelector('[data-company-next]')
    ?.addEventListener('click', () => align((active + 1) % records.length));
  align(active, true);
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
