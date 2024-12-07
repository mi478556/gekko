import { marked } from 'marked';

// Extend marked with custom renderer logic
marked.use({
  renderer: {
    link(href, title, text) {
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
    },
  },
});

export default marked;
