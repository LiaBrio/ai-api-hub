import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const APIS_DIR = path.join(PROJECT_ROOT, 'src/content/apis');
const SOURCES_FILE = path.join(SCRIPT_DIR, 'sources.json');
const TIMEOUT = 5_000;
const REQUEST_DELAY = 500;

type ApiStatus = 'active' | 'maintenance' | 'deprecated';
type ApiCategory =
  | 'openai-compatible'
  | 'multi-provider'
  | 'claude-api'
  | 'image-gen'
  | 'speech'
  | 'embedding'
  | 'other';
type AuthType = 'api-key' | 'oauth' | 'token' | 'free' | 'mixed';
type Pricing = 'free' | 'freemium' | 'paid' | 'pay-as-you-go';

interface ApiRecord {
  name: string;
  description: string;
  url: string;
  docsUrl?: string;
  models: string[];
  category: ApiCategory;
  tags: string[];
  authType: AuthType;
  pricing: Pricing;
  hasFreeQuota: boolean;
  status: ApiStatus;
  logo?: string;
  lastVerified: string;
  addedAt: string;
  weight: number;
}

interface SourceConfig {
  sources?: Array<string | { url: string; enabled?: boolean }>;
}

const categories: ApiCategory[] = [
  'openai-compatible',
  'multi-provider',
  'claude-api',
  'image-gen',
  'speech',
  'embedding',
  'other',
];
const authTypes: AuthType[] = ['api-key', 'oauth', 'token', 'free', 'mixed'];
const pricingTypes: Pricing[] = ['free', 'freemium', 'paid', 'pay-as-you-go'];

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithTimeout(url: string, method: 'GET' | 'HEAD'): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'ai-api-hub-health-check/1.0' },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkHealth(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, 'HEAD');
    return response.ok || response.status < 500;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  健康检查失败：${message}`);
    return false;
  }
}

function nextStatus(previousStatus: ApiStatus, reachable: boolean): ApiStatus {
  if (reachable) return 'active';
  if (previousStatus === 'maintenance' || previousStatus === 'deprecated') {
    return 'deprecated';
  }
  return 'maintenance';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeApi(value: unknown, now: string): ApiRecord | null {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  if (typeof source.name !== 'string' || !source.name.trim() || !isValidUrl(source.url)) {
    return null;
  }

  const category = categories.includes(source.category as ApiCategory)
    ? (source.category as ApiCategory)
    : 'other';
  const authType = authTypes.includes(source.authType as AuthType)
    ? (source.authType as AuthType)
    : 'mixed';
  const pricing = pricingTypes.includes(source.pricing as Pricing)
    ? (source.pricing as Pricing)
    : 'freemium';
  const description = typeof source.description === 'string' ? source.description.slice(0, 200) : '';

  const api: ApiRecord = {
    name: source.name.trim(),
    description,
    url: source.url,
    models: isStringArray(source.models) ? source.models : [],
    category,
    tags: isStringArray(source.tags) ? source.tags : [],
    authType,
    pricing,
    hasFreeQuota: typeof source.hasFreeQuota === 'boolean' ? source.hasFreeQuota : false,
    status: 'active',
    lastVerified: now,
    addedAt: typeof source.addedAt === 'string' ? source.addedAt : now,
    weight: typeof source.weight === 'number' && Number.isInteger(source.weight) ? source.weight : 0,
  };

  if (isValidUrl(source.docsUrl)) api.docsUrl = source.docsUrl;
  if (typeof source.logo === 'string') api.logo = source.logo;
  return api;
}

function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `api-${Date.now()}`;
}

async function readExistingApis(): Promise<Map<string, ApiRecord>> {
  const entries = await fs.readdir(APIS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  const apis = new Map<string, ApiRecord>();

  for (const fileName of files) {
    const filePath = path.join(APIS_DIR, fileName);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      apis.set(fileName, JSON.parse(content) as ApiRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`读取 ${fileName} 失败：${message}`);
    }
  }

  return apis;
}

async function discoverApis(existingApis: Map<string, ApiRecord>): Promise<number> {
  let config: SourceConfig;
  try {
    config = JSON.parse(await fs.readFile(SOURCES_FILE, 'utf8')) as SourceConfig;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn(`读取 sources.json 失败：${error instanceof Error ? error.message : String(error)}`);
    }
    return 0;
  }

  const knownUrls = new Set([...existingApis.values()].map((api) => api.url));
  const knownNames = new Set([...existingApis.values()].map((api) => api.name.toLowerCase()));
  let added = 0;

  for (const source of config.sources ?? []) {
    const sourceUrl = typeof source === 'string' ? source : source.url;
    if (typeof source !== 'string' && source.enabled === false) continue;

    try {
      console.log(`拉取数据源：${sourceUrl}`);
      const response = await fetchWithTimeout(sourceUrl, 'GET');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as unknown;
      const candidates = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object' && Array.isArray((payload as { apis?: unknown }).apis)
          ? (payload as { apis: unknown[] }).apis
          : [];

      for (const candidate of candidates) {
        const api = normalizeApi(candidate, new Date().toISOString());
        if (!api) {
          console.warn(`  跳过格式不完整的 API 记录`);
          continue;
        }
        if (knownUrls.has(api.url) || knownNames.has(api.name.toLowerCase())) continue;

        let fileName = `${slugify(api.name)}.json`;
        let suffix = 2;
        while (existingApis.has(fileName)) {
          fileName = `${slugify(api.name)}-${suffix}.json`;
          suffix += 1;
        }
        await fs.writeFile(path.join(APIS_DIR, fileName), `${JSON.stringify(api, null, 2)}\n`);
        existingApis.set(fileName, api);
        knownUrls.add(api.url);
        knownNames.add(api.name.toLowerCase());
        added += 1;
        console.log(`  新增：${api.name}（${fileName}）`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`数据源 ${sourceUrl} 拉取失败：${message}`);
    }

    await delay(REQUEST_DELAY);
  }

  return added;
}

async function main(): Promise<void> {
  const apis = await readExistingApis();
  const added = await discoverApis(apis);
  const stats: Record<ApiStatus, number> = { active: 0, maintenance: 0, deprecated: 0 };

  for (const [fileName, api] of apis) {
    console.log(`检查 ${api.name}：${api.url}`);
    const reachable = await checkHealth(api.url);
    const status = nextStatus(api.status, reachable);
    const updatedApi: ApiRecord = {
      ...api,
      status,
      lastVerified: new Date().toISOString(),
    };

    try {
      await fs.writeFile(
        path.join(APIS_DIR, fileName),
        `${JSON.stringify(updatedApi, null, 2)}\n`,
        'utf8',
      );
      stats[status] += 1;
      console.log(`  结果：${status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`写入 ${fileName} 失败：${message}`);
    }

    await delay(REQUEST_DELAY);
  }

  console.log('\n检查完成');
  console.log(`新增：${added}`);
  console.log(`active：${stats.active}`);
  console.log(`maintenance：${stats.maintenance}`);
  console.log(`deprecated：${stats.deprecated}`);
}

main().catch((error) => {
  console.error('数据采集失败：', error);
  process.exitCode = 1;
});
