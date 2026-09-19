export {};
const root = document.querySelector<HTMLElement>('[data-team-review]');
if (root) {
  const buttons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-person]'),
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
    panels.forEach((panel) => (panel.hidden = panel.dataset.personBio !== id));
  };
  buttons.forEach((button) => {
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') {
        pinned = false;
        select(button.dataset.person);
      }
    });
    button.addEventListener('pointerleave', (event) => {
      if (
        event.pointerType === 'mouse' &&
        !pinned &&
        document.activeElement !== button
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
