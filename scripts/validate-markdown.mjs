import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeImageAttributes from '../src/lib/rehype-image-attributes.mjs';
import rehypeLocalizeFootnotes from '../src/lib/rehype-localize-footnotes.mjs';

const processor = await createMarkdownProcessor({
  syntaxHighlight: false,
  rehypePlugins: [rehypeImageAttributes, rehypeLocalizeFootnotes],
});
const { code } = await processor.render('관측 기록에 각주를 답니다.[^1]\n\n> [!TIP]\n> 저배율로 대상을 먼저 찾습니다.\n\n![목성의 줄무늬](/images/jupiter.jpg "촬영 당시 확인한 목성의 대기 띠")\n\n| 대상 | 배율 |\n| --- | ---: |\n| 목성 | 120x |\n\n[^1]: 각주 내용입니다.');

for (const marker of ['data-footnotes', 'data-footnote-ref', '각주 1의 본문으로 돌아가기', '>각주</h2>', 'class="article-callout article-callout-tip"', 'aria-label="관측 팁"', 'class="markdown-figure"', '<figcaption>촬영 당시 확인한 목성의 대기 띠</figcaption>', 'loading="lazy"', 'class="table-scroll"', 'scope="col"', '좌우로 스크롤할 수 있습니다']) {
  if (!code.includes(marker)) throw new Error(`Markdown 각주 렌더링 검사 실패: ${marker}`);
}

console.log('Markdown 기능 검사: 강조 상자·각주·이미지 캡션·반응형 표 렌더링 이상 없음');
