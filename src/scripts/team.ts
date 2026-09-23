export {};
const root = document.querySelector<HTMLElement>('[data-team-review]');
if (root) {
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>('[data-person]'),
  ];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-team-member]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-person-bio]')];
  let selected = '';
  const select = (id = '') => {
    selected = id;
    buttons.forEach((button) =>
      button.setAttribute(
        'aria-expanded',
        String(button.dataset.person === id),
      ),
    );
    cards.forEach((card) =>
      card.classList.toggle('is-active', card.dataset.teamMember === id),
    );
    panels.forEach((panel) => (panel.hidden = panel.dataset.personBio !== id));
  };
  const close = () => {
    const button = buttons.find((b) => b.dataset.person === selected);
    select();
    button?.focus({ preventScroll: true });
  };
  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      select(selected === button.dataset.person ? '' : button.dataset.person);
      if (selected)
        root
          .querySelector<HTMLElement>(`[data-person-bio]:not([hidden])`)
          ?.focus({ preventScroll: true });
    }),
  );
  panels.forEach((panel) => {
    panel.addEventListener('click', (event) => {
      if (
        !(event.target as Element).closest('a, button') &&
        !getSelection()?.toString()
      )
        close();
    });
    panel.addEventListener('keydown', (event) => {
      if (event.target === panel && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        close();
      }
    });
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}
