export {};
const root = document.querySelector<HTMLElement>('[data-team-review]');
if (root) {
  const buttons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-person]'),
  );
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>('[data-team-member]'),
  );
  const panels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-person-bio]'),
  );
  let selected = '';
  let pinned = false;
  const select = (id = '') => {
    selected = id;
    buttons.forEach((button) =>
      button.setAttribute(
        'aria-expanded',
        String(button.dataset.person === id),
      ),
    );
    cards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.teamMember === id);
    });
    panels.forEach((panel) => (panel.hidden = panel.dataset.personBio !== id));
  };
  cards.forEach((card) => {
    const button = card.querySelector<HTMLButtonElement>('[data-person]');
    if (!button) return;
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') {
        pinned = false;
        select(button.dataset.person);
      }
    });
    card.addEventListener('pointerleave', (event) => {
      if (
        event.pointerType === 'mouse' &&
        !pinned &&
        !card.contains(document.activeElement)
      )
        select();
    });
    button.addEventListener('focus', () => select(button.dataset.person));
    button.addEventListener('click', () => {
      if (pinned && selected === button.dataset.person) {
        pinned = false;
        select();
      } else {
        pinned = true;
        select(button.dataset.person);
      }
    });
  });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node)) {
      pinned = false;
      select();
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      pinned = false;
      select();
      (document.activeElement as HTMLElement)?.blur();
    }
  });
}
