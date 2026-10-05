const filters = document.querySelector<HTMLElement>('[data-portfolio-filters]');

if (filters) {
  const buttons = [
    ...filters.querySelectorAll<HTMLButtonElement>('[data-portfolio-filter]'),
  ];
  const cards = [
    ...document.querySelectorAll<HTMLElement>('[data-company-card]'),
  ];

  const select = (sector: string) => {
    buttons.forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.portfolioFilter === sector),
      ),
    );
    cards.forEach((card) => {
      const memberships = (card.dataset.sectors || '').split(' ');
      card.hidden = sector !== 'all' && !memberships.includes(sector);
    });
  };

  buttons.forEach((button) =>
    button.addEventListener('click', () =>
      select(button.dataset.portfolioFilter || 'all'),
    ),
  );
}
