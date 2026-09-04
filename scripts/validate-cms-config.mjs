import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const configPath = resolve(process.cwd(), 'public/admin/config.yml');
const source = await readFile(configPath, 'utf8');
let config;

try {
  config = parse(source);
} catch (error) {
  throw new Error(`CMS config YAML 오류: ${error.message}`);
}

const errors = [];
const posts = config?.collections?.find((collection) => collection.name === 'posts');
const fields = posts?.fields ?? [];
const fieldNames = fields.map((field) => field.name);
const requiredFields = ['title', 'description', 'category', 'tags', 'publishedAt', 'draft', 'cover', 'coverAlt', 'references', 'body'];

if (config?.backend?.name !== 'github') errors.push('backend.name은 github여야 합니다.');
if (config?.backend?.branch !== 'main') errors.push('CMS 저장 브랜치는 main이어야 합니다.');
if (config?.media_folder !== 'public/uploads' || config?.public_folder !== '/uploads') errors.push('이미지 저장 경로 설정을 확인하세요.');
if (!posts) errors.push('posts 컬렉션을 찾을 수 없습니다.');
for (const name of requiredFields) if (!fieldNames.includes(name)) errors.push(`필수 CMS 필드가 없습니다: ${name}`);
for (const name of new Set(fieldNames.filter((field, index) => fieldNames.indexOf(field) !== index))) errors.push(`중복 CMS 필드가 있습니다: ${name}`);
if (fields.find((field) => field.name === 'draft')?.default !== true) errors.push('새 게시물은 초안(draft: true)으로 시작해야 합니다.');
if (!Array.isArray(posts?.view_filters) || posts.view_filters.length < 2) errors.push('초안/공개 글 목록 필터가 필요합니다.');

console.log(`CMS 설정 검사: 컬렉션 ${config?.collections?.length ?? 0}개, 게시물 필드 ${fields.length}개`);
for (const error of errors) console.error(`오류  ${error}`);
if (errors.length) process.exitCode = 1;
else console.log('결과: CMS 설정 이상 없음');
