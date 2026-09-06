export default function rehypeImageAttributes() {
  return (tree) => {
    const visit = (node) => {
      if (!Array.isArray(node?.children)) return;

      node.children.forEach((child, index) => {
        if (child?.type === 'element' && child.tagName === 'p' && child.children?.length === 1) {
          const image = child.children[0];
          const caption = image?.type === 'element' && image.tagName === 'img'
            ? String(image.properties?.title ?? '').trim()
            : '';
          if (caption) {
            delete image.properties.title;
            node.children[index] = {
              type: 'element',
              tagName: 'figure',
              properties: { className: ['markdown-figure'] },
              children: [
                image,
                { type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: caption }] },
              ],
            };
          }
        }
      });

      node.children.forEach((child) => {
        if (child?.type === 'element' && child.tagName === 'img') {
          child.properties ??= {};
          child.properties.loading ??= 'lazy';
          child.properties.decoding ??= 'async';
        }
        visit(child);
      });
    };

    visit(tree);
  };
}
