export default function rehypeLocalizeFootnotes() {
  return (tree) => {
    const visit = (node) => {
      if (node?.type === 'element') {
        if (node.tagName === 'h2' && node.properties?.id === 'footnote-label') {
          node.children = [{ type: 'text', value: '각주' }];
        }
        if (node.tagName === 'a' && node.properties?.dataFootnoteBackref !== undefined) {
          const reference = String(node.properties.ariaLabel ?? '').match(/\d+/)?.[0];
          node.properties.ariaLabel = reference ? `각주 ${reference}의 본문으로 돌아가기` : '각주의 본문으로 돌아가기';
        }
      }
      node?.children?.forEach(visit);
    };
    visit(tree);
  };
}
