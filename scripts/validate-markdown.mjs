import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeLocalizeFootnotes from '../src/lib/rehype-localize-footnotes.mjs';

const processor = await createMarkdownProcessor({
  syntaxHighlight: false,
  rehypePlugins: [rehypeLocalizeFootnotes],
});
const { code } = await processor.render('관측 기록에 각주를 답니다.[^1]\n\n[^1]: 각주 내용입니다.');

for (const marker of ['data-footnotes', 'data-footnote-ref', '각주 1의 본문으로 돌아가기', '>각주</h2>']) {
  if (!code.includes(marker)) throw new Error(`Markdown 각주 렌더링 검사 실패: ${marker}`);
}

console.log('Markdown 기능 검사: 각주 렌더링 및 한국어 접근성 문구 이상 없음');
