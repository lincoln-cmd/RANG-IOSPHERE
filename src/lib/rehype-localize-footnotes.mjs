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
        if (node.tagName === 'thead') {
          node.children?.forEach((row) => row.children?.forEach((cell) => {
            if (cell.tagName === 'th') cell.properties = { ...cell.properties, scope: 'col' };
          }));
        }
      }
      node?.children?.forEach((child, index) => {
        if (child?.type === 'element' && child.tagName === 'table') {
          node.children[index] = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              role: 'region',
              tabIndex: 0,
              ariaLabel: '표: 좌우로 스크롤할 수 있습니다',
            },
            children: [child],
          };
          visit(child);
        } else {
          visit(child);
        }
      });
    };
    visit(tree);
  };
}
