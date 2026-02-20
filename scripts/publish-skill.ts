/**
 * HCS-26 Skill Publishing Script
 *
 * Publishes the OpSpawn Agent Marketplace skill to the HOL Registry Broker
 * using the HCS-26 Decentralized Agent Skills Registry protocol.
 *
 * Usage: npx tsx scripts/publish-skill.ts
 *
 * Requires HEDERA_PRIVATE_KEY in .env.local for authentication.
 */

import dotenv from 'dotenv';
import path from 'path';
import { RegistryBrokerClient } from '@hashgraphonline/standards-sdk';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const API_BASE = 'https://hol.org/registry/api/v1';
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 300_000; // 5 min
const QUOTE_ONLY = process.argv.includes('--quote-only');

// ── Skill definition ──────────────────────────────────────────────────

const skillJson = {
  name: 'opspawn-agent-marketplace',
  version: '1.0.0',
  description:
    'Privacy-preserving AI agent marketplace on Hedera. Discover, hire, and interact with AI agents via HCS-10 messaging, HCS-19 consent, HCS-26 skills, HCS-20 reputation, and x402 micropayments.',
  license: 'MIT',
  author: {
    name: 'OpSpawn',
    url: 'https://opspawn.com',
    contact: 'hello@opspawn.com',
  },
  homepage: 'https://hedera.opspawn.com',
  repo: 'https://github.com/opspawn/hedera-agent-marketplace',
  keywords: [
    'ai-agent',
    'agent-marketplace',
    'agent-discovery',
    'hedera',
    'hcs-10',
    'hcs-19',
    'hcs-20',
    'hcs-26',
    'x402',
    'privacy',
  ],
  skill: {
    name: 'opspawn-agent-marketplace',
    emoji: '🏪',
    category: 'marketplace',
    api_base: 'https://hedera.opspawn.com/api',
    protocols: ['hcs-10', 'hcs-11', 'hcs-14', 'hcs-19', 'hcs-20', 'hcs-26', 'hip-991', 'x402'],
    capabilities: [
      'agent-discovery',
      'agent-hiring',
      'skill-publishing',
      'reputation-tracking',
      'privacy-compliance',
      'chat',
      'credit-management',
    ],
  },
  api: {
    base_url: 'https://hedera.opspawn.com/api',
    endpoints: {
      search_agents: 'GET /agents/search',
      discover: 'GET /agents/discover',
      agent_detail: 'GET /agents/:id',
      hire_agent: 'POST /agents/:id/hire',
      chat: 'POST /chat/message',
      reputation: 'GET /agents/:id/reputation',
      privacy_consent: 'POST /privacy/consent',
      skills: 'GET /agents/:id/skills',
    },
  },
  integrations: {
    hcs10: { supported: true, inbound_topic: '0.0.7854276', outbound_topic: '0.0.7854275' },
    hcs19: { supported: true, description: 'GDPR/CCPA consent management' },
    hcs20: { supported: true, description: 'On-chain reputation tracking' },
    hcs26: { supported: true, description: 'Skill registry and discovery' },
    x402: { supported: true, description: 'HTTP 402 micropayments' },
  },
};

const skillMd = `# OpSpawn Agent Marketplace

A privacy-preserving AI agent marketplace built on Hedera, integrating 10+ HCS standards.

## Capabilities

- **Agent Discovery**: Search and discover AI agents by capability, reputation, or specialty
- **Agent Hiring**: Hire agents for tasks via HCS-10 secure messaging
- **Skill Publishing**: Register and discover agent skills via HCS-26
- **Reputation Tracking**: On-chain reputation scores via HCS-20
- **Privacy Compliance**: GDPR/CCPA consent management via HCS-19
- **Chat**: Natural language interaction with marketplace agents
- **Credit Management**: Purchase and manage credits for marketplace operations

## Standards Integrated

| Standard | Purpose |
|----------|---------|
| HCS-10 | Agent-to-agent messaging |
| HCS-11 | Agent identity profiles |
| HCS-14 | Token associations |
| HCS-19 | Privacy & consent management |
| HCS-20 | On-chain reputation |
| HCS-26 | Skills registry |
| HIP-991 | Permissionless topic creation |
| HTS | Hedera Token Service integration |

## API Endpoints

- \`GET /api/agents/search?q=<query>\` — Search agents
- \`GET /api/agents/discover\` — Discover agents by criteria
- \`GET /api/agents/:id\` — Get agent details
- \`POST /api/agents/:id/hire\` — Hire an agent
- \`POST /api/chat/message\` — Send chat message
- \`GET /api/agents/:id/reputation\` — Get reputation score
- \`POST /api/privacy/consent\` — Manage privacy consent
- \`GET /api/agents/:id/skills\` — List agent skills

## Getting Started

Visit [hedera.opspawn.com](https://hedera.opspawn.com) to explore the marketplace.

## License

MIT
`;

// ── Helpers ──────────────────────────────────────────────────────────

function toBase64(content: string): string {
  return Buffer.from(content, 'utf8').toString('base64');
}

function guessMimeType(name: string): string {
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

function resolveRole(name: string): string {
  if (name === 'SKILL.md') return 'skill-md';
  if (name === 'skill.json') return 'skill-json';
  return 'file';
}

interface FileEntry {
  name: string;
  base64: string;
  mimeType: string;
  role: string;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const accountId = process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';
  const privateKey = process.env.HEDERA_PRIVATE_KEY || '';

  if (!privateKey) {
    console.error('ERROR: HEDERA_PRIVATE_KEY not set in .env.local');
    process.exit(1);
  }

  console.log('\n=== HCS-26 Skill Publishing ===');
  console.log(`Account: ${accountId}`);
  console.log(`Skill:   ${skillJson.name}@${skillJson.version}`);
  console.log();

  // Step 1: Authenticate with Registry Broker
  console.log('[1/5] Authenticating with Registry Broker...');
  const client = new RegistryBrokerClient({ baseUrl: API_BASE });

  await client.authenticateWithLedgerCredentials({
    accountId,
    network: 'hedera:testnet',
    hederaPrivateKey: privateKey,
    expiresInMinutes: 30,
    label: 'OpSpawn Marketplace',
  });

  const headers = client.getDefaultHeaders();
  console.log('  Authenticated successfully');

  // Step 2: Build file list
  console.log('[2/5] Building skill package...');

  const files: FileEntry[] = [
    {
      name: 'skill.json',
      base64: toBase64(JSON.stringify(skillJson, null, 2) + '\n'),
      mimeType: 'application/json',
      role: 'skill-json',
    },
    {
      name: 'SKILL.md',
      base64: toBase64(skillMd),
      mimeType: 'text/markdown',
      role: 'skill-md',
    },
  ];

  const totalBytes = files.reduce((sum, f) => sum + Buffer.from(f.base64, 'base64').byteLength, 0);
  console.log(`  Files: ${files.length}, Total bytes: ${totalBytes}`);

  // Step 3: Get quote
  console.log('[3/5] Getting publish quote...');

  const quoteRes = await fetch(`${API_BASE}/skills/quote`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ files, accountId }),
  });

  if (!quoteRes.ok) {
    const err = await quoteRes.text();
    console.error(`  Quote failed (${quoteRes.status}): ${err}`);
    process.exit(1);
  }

  const quote = (await quoteRes.json()) as {
    quoteId: string;
    credits: number;
    estimatedCostHbar: string;
  };
  console.log(`  Quote ID: ${quote.quoteId}`);
  console.log(`  Credits: ${quote.credits}`);
  console.log(`  Estimated cost: ${quote.estimatedCostHbar} HBAR`);

  if (QUOTE_ONLY) {
    console.log('\n=== Quote Complete (--quote-only mode) ===');
    console.log('  To actually publish, run without --quote-only after purchasing credits.');
    console.log('  Use: npx tsx scripts/test-credits.ts --purchase');
    return;
  }

  // Step 4: Publish
  console.log('[4/5] Publishing skill...');

  const publishRes = await fetch(`${API_BASE}/skills/publish`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ files, quoteId: quote.quoteId, accountId }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    console.error(`  Publish failed (${publishRes.status}): ${err}`);
    if (err.includes('Insufficient credits')) {
      console.log('\n  You need credits to publish. Purchase credits first:');
      console.log('  npx tsx scripts/test-credits.ts --purchase');
      console.log(`\n  Required: ${quote.credits} credits (~${quote.estimatedCostHbar} HBAR)`);
      console.log('  Note: Credit purchases require mainnet HBAR.');
    }
    process.exit(1);
  }

  const publishResult = (await publishRes.json()) as { jobId: string };
  console.log(`  Job ID: ${publishResult.jobId}`);

  // Step 5: Poll for completion
  console.log('[5/5] Waiting for publish to complete...');

  const startedAt = Date.now();
  let lastStatus = '';

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const jobRes = await fetch(
      `${API_BASE}/skills/jobs/${encodeURIComponent(publishResult.jobId)}?accountId=${encodeURIComponent(accountId)}`,
      { headers },
    );

    if (!jobRes.ok) {
      console.error(`  Job poll failed (${jobRes.status})`);
      break;
    }

    const job = (await jobRes.json()) as {
      status: string;
      failureReason?: string;
      name?: string;
      version?: string;
      directoryTopicId?: string;
      packageTopicId?: string;
      skillJsonHrl?: string;
    };

    if (job.status !== lastStatus) {
      console.log(`  Status: ${job.status}`);
      lastStatus = job.status;
    }

    if (job.status === 'completed') {
      console.log('\n=== Skill Published Successfully ===');
      console.log(`  Name:              ${job.name}`);
      console.log(`  Version:           ${job.version}`);
      console.log(`  Directory Topic:   ${job.directoryTopicId}`);
      console.log(`  Package Topic:     ${job.packageTopicId}`);
      console.log(`  skill.json HRL:    ${job.skillJsonHrl}`);
      console.log(`  Job ID:            ${publishResult.jobId}`);
      console.log(`  Quote ID:          ${quote.quoteId}`);
      return;
    }

    if (job.status === 'failed') {
      console.error(`\n  Publish FAILED: ${job.failureReason || 'unknown reason'}`);
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error('\n  Publish timed out after 5 minutes');
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
