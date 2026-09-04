import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const apiCollection = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/apis' }),
  schema: z.object({
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
  }),
});

export const collections = { apis: apiCollection };
