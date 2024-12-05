import { marked } from 'marked';

// Customize the link rendering to open in a new tab
const renderer = new marked.Renderer();

renderer.link = function (href, title, text) {
  const external = /^https?:\/\/.+$/.test(href);
  const newWindow = external || title === 'newWindow';
  let out = `<a href="${href}"`;
  if (newWindow) {
    out += ' target="_blank"';
  }
  if (title && title !== 'newWindow') {
    out += ` title="${title}"`;
  }
  out += `>${text}</a>`;
  return out;
};

// Apply the custom renderer
marked.setOptions({
  renderer: renderer,
});

export default marked;
