import { spawnSync } from 'node:child_process';
import sodium from 'libsodium-wrappers';

const repository = 'Vurios/Shelter_Call';
const names = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
for (const name of names)
  if (!process.env[name]?.trim()) {
    console.error(`Missing environment variable: ${name}.`);
    process.exit(1);
  }

// Secrets are read only from the process environment. API bodies stay in memory.
function gh(args, input) {
  const result = spawnSync('gh', ['api', ...args], {
    encoding: 'utf8',
    input,
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(
      'GitHub API refused the request; verify repository admin access.',
    );
  return result.stdout ? JSON.parse(result.stdout) : null;
}

await sodium.ready;
const key = gh([`repos/${repository}/actions/secrets/public-key`]);
for (const name of names) {
  const encrypted = sodium.crypto_box_seal(
    sodium.from_string(process.env[name].trim()),
    sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL),
  );
  try {
    gh(
      [
        '--method',
        'PUT',
        `repos/${repository}/actions/secrets/${name}`,
        '--input',
        '-',
      ],
      JSON.stringify({
        encrypted_value: sodium.to_base64(
          encrypted,
          sodium.base64_variants.ORIGINAL,
        ),
        key_id: key.key_id,
      }),
    );
    console.log(`Stored repository secret: ${name}.`);
  } catch {
    throw new Error(
      `Add ${name} in repository Settings > Secrets and variables > Actions.`,
    );
  }
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID.trim())}/pages/projects`;
const headers = {
  Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN.trim()}`,
  'Content-Type': 'application/json',
};
let response = await fetch(`${endpoint}/shelter-call`, { headers });
if (response.status === 404)
  response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'shelter-call', production_branch: 'main' }),
  });
const result = await response.json();
if (!response.ok || !result.success)
  throw new Error(
    `Cloudflare project setup failed (HTTP ${response.status}); verify Pages Edit permission for this account.`,
  );
if (result.result.production_branch !== 'main')
  throw new Error(
    'Existing shelter-call project must use production branch main.',
  );
console.log('Cloudflare Pages project shelter-call is ready on main.');
