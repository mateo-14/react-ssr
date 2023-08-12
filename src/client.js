import { hydrateRoot } from 'react-dom/client';

export function hydrate(component) {
  const root = document.getElementById('root');
  const props = JSON.parse(document.querySelector('#props-data').textContent);
  document.querySelector('#props-data').remove();
  hydrateRoot(root, component(props));
}
