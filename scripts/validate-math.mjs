import katex from 'katex';
import 'katex/contrib/mhchem';

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

console.log(`수식 렌더링 검사: 화학식 예제 ${samples.length}개`);
console.log('결과: KaTeX mhchem 이상 없음');
