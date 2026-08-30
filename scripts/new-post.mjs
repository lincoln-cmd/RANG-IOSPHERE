import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { stringify } from 'yaml';

const root = process.cwd();
const postsDir = resolve(root, 'src/data/posts');
const categoryChoices = [
  ['observation', '관측일지'],
  ['equipment', '장비와 사용법'],
  ['theory', '관측 이론'],
  ['simulation', '시뮬레이션'],
  ['open-data', '오픈데이터'],
];

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=', 2);
  if (inlineValue !== undefined) args.set(key, inlineValue);
  else if (process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) args.set(key, process.argv[++index]);
  else args.set(key, true);
}

const cleanSlug = (value) => value
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-');

const normalizeCategory = (value) => {
  const matchByNumber = categoryChoices[Number(value) - 1]?.[0];
  const matchByKey = categoryChoices.find(([key]) => key === value)?.[0];
  return matchByNumber ?? matchByKey;
};

const templates = {
  observation: `## 관측 개요\n\n<!-- 관측 목적과 대상을 기록합니다. -->\n\n## 관측 조건\n\n<!-- 날씨, 시상, 투명도, 광해 등 관측 환경을 기록합니다. -->\n\n## 장비와 설정\n\n<!-- 망원경, 가대, 접안렌즈 또는 촬영 설정을 기록합니다. -->\n\n## 관측 과정\n\n## 관측 결과\n\n## 시뮬레이션·공개 데이터 비교\n\n## 해석과 다음 관측 계획\n\n## 참고 자료\n`,
  equipment: `## 이 글을 작성하는 목적\n\n## 구조와 주요 부품\n\n## 작동 원리\n\n## 실제 사용 방법\n\n## 장점과 한계\n\n## 직접 정리한 결론\n\n## 참고 자료\n`,
  theory: `## 탐구 질문\n\n## 핵심 개념\n\n## 원리와 과정\n\n## 관측 활동과의 연결\n\n## 직접 정리한 결론\n\n## 참고 자료\n`,
  simulation: `## 탐구 목적\n\n## 모델과 가정\n\n## 입력값과 실행 조건\n\n## 결과\n\n## 실제 관측값과 비교\n\n## 오차와 한계\n\n## 참고 자료\n`,
  'open-data': `## 탐구 질문\n\n## 데이터 출처\n\n## 데이터 설명과 전처리\n\n## 분석 과정\n\n## 결과\n\n## 직접 관측값과 비교\n\n## 한계와 다음 탐구\n\n## 참고 자료\n`,
};

let rl;
const ask = async (label, fallback = '') => {
  rl ??= createInterface({ input, output });
  const answer = (await rl.question(`${label}${fallback ? ` (${fallback})` : ''}: `)).trim();
  return answer || fallback;
};

try {
  const title = String(args.get('title') || await ask('글 제목'));
  if (!title) throw new Error('글 제목은 필수입니다.');

  if (!args.has('category')) {
    output.write(`\n${categoryChoices.map(([key, label], index) => `  ${index + 1}. ${label} (${key})`).join('\n')}\n\n`);
  }
  const categoryInput = String(args.get('category') || await ask('분류 번호 또는 값', '1'));
  const category = normalizeCategory(categoryInput);
  if (!category) throw new Error(`지원하지 않는 분류입니다: ${categoryInput}`);

  const suggestedSlug = cleanSlug(title) || `post-${new Date().toISOString().slice(0, 10)}`;
  const slug = cleanSlug(String(args.get('slug') || await ask('영문 파일명', suggestedSlug)));
  if (!slug) throw new Error('영문 파일명을 만들 수 없습니다.');

  const description = String(args.get('description') || await ask('한두 문장 설명'));
  const tagsInput = String(args.get('tags') || await ask('태그 (쉼표로 구분)'));
  const tags = [...new Set(tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean))];
  const targetPath = resolve(postsDir, `${slug}.md`);

  const frontmatter = {
    title,
    description,
    category,
    tags,
    draft: true,
    featured: false,
    ...(category === 'observation' ? {
      observation: {
        target: '',
        location: '',
        equipment: [],
        conditions: '',
      },
    } : {}),
  };
  const content = `---\n${stringify(frontmatter, { lineWidth: 0 }).trim()}\n---\n\n> 작성 중인 초안입니다. 완성 후 \`publishedAt\`을 입력하고 \`draft: false\`로 변경합니다.\n\n${templates[category]}`;

  if (args.get('dry-run')) {
    output.write(`\n생성 예정: ${targetPath}\n\n${content}\n`);
  } else {
    await mkdir(postsDir, { recursive: true });
    try {
      await access(targetPath, constants.F_OK);
      throw new Error(`같은 파일이 이미 존재합니다: ${targetPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await writeFile(targetPath, content, 'utf8');
    output.write(`\n초안을 생성했습니다: ${targetPath}\n`);
    output.write('작성 중에는 draft: true를 유지하세요.\n');
  }
} catch (error) {
  console.error(`\n오류: ${error.message}`);
  process.exitCode = 1;
} finally {
  rl?.close();
}
