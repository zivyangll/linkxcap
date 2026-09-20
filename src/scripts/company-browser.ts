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
    const shellRect = continuation?.getBoundingClientRect();
    const railCenterY = rr.top + rail.clientHeight / 2;
    let nearest = active,
      distance = Infinity;
    links.forEach((link, i) => {
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
        nearest = i;
      }
    });
    // The source artwork already contains the full dotted circle. Its right
    // segment is covered by the rail shell so it cannot form a second arc.
    // These virtual rows extend the real company markers before the first and
    // after the last record, keeping the single reconstructed arc continuous
    // even when the scroll reaches Home or End.
    if (desktopRail.matches && continuation && shellRect && links.length) {
      const first = links[0].getBoundingClientRect();
      const last = links.at(-1)!.getBoundingClientRect();
      const rowStep =
        links.length > 1
          ? links[1].getBoundingClientRect().top - first.top
          : first.height;
      const positionDot = (dot: HTMLElement, pageY: number) => {
        const circleDeltaY = pageY - orbitCenterY;
        const visible =
          Math.abs(circleDeltaY) <= orbitRadius &&
          pageY >= rr.top - rowStep * 0.5 &&
          pageY <= rr.bottom + rowStep * 0.5;
        const circleX =
          orbitCenterX +
          Math.sqrt(
            Math.max(
              0,
              orbitRadius * orbitRadius - circleDeltaY * circleDeltaY,
            ),
          );
        const normalized = Math.min(
          1,
          Math.abs(pageY - railCenterY) / (rail.clientHeight / 2),
        );
        const edgeFade = Math.max(0, (normalized - 0.42) / 0.58);
        dot.style.left = `${circleX - shellRect.left}px`;
        dot.style.top = `${pageY - shellRect.top}px`;
        dot.style.setProperty(
          '--arc-dot-opacity',
          visible ? String(0.72 - edgeFade * 0.58) : '0',
        );
        dot.style.setProperty('--arc-dot-blur', `${edgeFade * 3.2}px`);
        dot.style.setProperty('--arc-dot-scale', String(1 - edgeFade * 0.24));
      };
      const firstCenter = first.top + first.height / 2;
      const lastCenter = last.top + last.height / 2;
      topDots.forEach((dot, index) =>
        positionDot(dot, firstCenter - rowStep * (index + 1)),
      );
      bottomDots.forEach((dot, index) =>
        positionDot(dot, lastCenter + rowStep * (index + 1)),
      );
    } else {
      [...topDots, ...bottomDots].forEach((dot) =>
        dot.style.setProperty('--arc-dot-opacity', '0'),
      );
    }
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
