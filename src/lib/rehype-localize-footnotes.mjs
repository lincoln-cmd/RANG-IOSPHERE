export default function rehypeLocalizeFootnotes() {
  return (tree) => {
    const calloutLabels = {
      NOTE: '참고',
      TIP: '관측 팁',
      IMPORTANT: '중요',
      WARNING: '주의',
      CAUTION: '위험',
    };
    const visit = (node) => {
      if (node?.type === 'element') {
        if (node.tagName === 'blockquote') {
          const firstParagraph = node.children?.find((child) => child?.type === 'element' && child.tagName === 'p');
          const firstText = firstParagraph?.children?.[0];
          const calloutType = firstText?.type === 'text'
            ? firstText.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\r?\n|\s+)/i)?.[1]?.toUpperCase()
            : undefined;
          if (calloutType) {
            const label = calloutLabels[calloutType];
            firstText.value = firstText.value.replace(/^\[![A-Z]+\](?:\r?\n|\s+)/i, '');
            node.tagName = 'aside';
            node.properties = {
              ...node.properties,
              className: ['article-callout', `article-callout-${calloutType.toLowerCase()}`],
              ariaLabel: label,
            };
            node.children.unshift({
              type: 'element',
              tagName: 'p',
              properties: { className: ['article-callout-label'] },
              children: [{ type: 'text', value: label }],
            });
          }
        }
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
