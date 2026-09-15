// Only the separate study reads this view parameter. The site's router and
// publication gates still own the actual pages inside its preview frame.
export const FANCY_VIEWS = Object.freeze({
  home: { label: 'Home', path: '/index.html' },
  work: { label: 'Work', path: '/portfolio.html' },
  about: { label: 'About', path: '/about.html' },
  contact: { label: 'Contact', path: '/contact.html' },
});

export function fancyViewFromPath(path) {
  if (/\/(?:portfolio|playground)(?:\.html)?$/.test(path)) return 'work';
  if (/\/about(?:\.html)?$/.test(path)) return 'about';
  if (/\/contact(?:\.html)?$/.test(path)) return 'contact';
  return 'home';
}
