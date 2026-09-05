import katex from 'katex';
import 'katex/contrib/mhchem';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const samples = [
  String.raw`\ce{H2O}`,
  String.raw`\ce{CO2 + H2O <=> H2CO3}`,
  String.raw`\ce{Ca^{2+} + CO3^{2-} -> CaCO3 v}`,
  String.raw`\ce{^{12}C^{16}O}`,
];

for (const sample of samples) {
  const html = katex.renderToString(sample, { throwOnError: true });
  if (!html.includes('katex') || html.includes('katex-error')) {
    throw new Error(`화학식을 렌더링하지 못했습니다: ${sample}`);
  }
}

const processor = await createMarkdownProcessor({
  syntaxHighlight: false,
  remarkPlugins: [remarkMath],
  rehypePlugins: [[rehypeKatex, { strict: false }]],
});
const { code } = await processor.render(`물은 $\\ce{H2O}$입니다.\n\n$$\n\\ce{CO2 + H2O <=> H2CO3}\n$$`);
const renderedFormulaCount = (code.match(/class="katex"/g) ?? []).length;
if (code.includes('katex-error') || renderedFormulaCount < 2) {
  throw new Error('Astro Markdown 렌더러에 mhchem이 적용되지 않았습니다.');
}

console.log(`수식 렌더링 검사: 화학식 예제 ${samples.length}개, Astro Markdown 통합 1개`);
console.log('결과: KaTeX mhchem 및 Astro 통합 이상 없음');
