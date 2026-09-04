import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APIS_DIR = path.resolve(SCRIPT_DIR, '../src/content/apis');

const apiSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(200),
  url: z.string().url(),
  docsUrl: z.string().url().optional(),
  models: z.array(z.string()).default([]),
  category: z.enum([
    'openai-compatible',
    'multi-provider',
    'claude-api',
    'image-gen',
    'speech',
    'embedding',
    'other',
  ]),
  tags: z.array(z.string()).default([]),
  authType: z.enum(['api-key', 'oauth', 'token', 'free', 'mixed']),
  pricing: z.enum(['free', 'freemium', 'paid', 'pay-as-you-go']).default('freemium'),
  hasFreeQuota: z.boolean().default(false),
  status: z.enum(['active', 'maintenance', 'deprecated']).default('active'),
  logo: z.string().optional(),
  lastVerified: z.string().datetime(),
  addedAt: z.string().datetime(),
  weight: z.number().int().default(0),
});

interface ValidationFailure {
  fileName: string;
  errors: string[];
}

function formatPath(pathParts: PropertyKey[]): string {
  return pathParts.length > 0 ? pathParts.map(String).join('.') : '(root)';
}

async function main(): Promise<void> {
  const entries = await fs.readdir(APIS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();

  let successCount = 0;
  const failures: ValidationFailure[] = [];

  for (const fileName of files) {
    try {
      const content = await fs.readFile(path.join(APIS_DIR, fileName), 'utf8');
      const data = JSON.parse(content) as unknown;
      const result = apiSchema.safeParse(data);

      if (result.success) {
        successCount += 1;
        continue;
      }

      failures.push({
        fileName,
        errors: result.error.issues.map(
          (issue) => `${formatPath(issue.path)}：${issue.message}`,
        ),
      });
    } catch (error) {
      failures.push({
        fileName,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  console.log('数据校验完成');
  console.log(`成功：${successCount}`);
  console.log(`失败：${failures.length}`);

  for (const failure of failures) {
    console.error(`\n${failure.fileName}`);
    for (const error of failure.errors) {
      console.error(`  - ${error}`);
    }
  }

  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error('数据校验脚本执行失败：', error);
  process.exit(1);
});
