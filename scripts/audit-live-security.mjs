// Read-only audit. Uses the existing Firebase CLI login; prints no credentials,
// personal content, object paths, download tokens or API key values.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

process.env.DEBUG = '';
const cli = createRequire(join(process.env.APPDATA, 'npm/node_modules/firebase-tools/package.json'));
const { getProjectDefaultAccount } = cli('./lib/auth');
const { requireAuth } = cli('./lib/requireAuth');
const { getAccessToken } = cli('./lib/apiv2');
const project = 'travyon-5fb01';
const projectNumber = '338987864218';
const account = getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Firebase CLI login required');
await requireAuth({ project, ...account, nonInteractive: true });
const accessToken = await getAccessToken();
const allowedHosts = new Set([
  'firebase.googleapis.com', 'firebaseappcheck.googleapis.com',
  'apikeys.googleapis.com', 'firestore.googleapis.com',
  'storage.googleapis.com', 'firebaserules.googleapis.com',
  'cloudfunctions.googleapis.com',
]);
async function read(url) {
  if (!allowedHosts.has(new URL(url).hostname)) throw new Error('Unexpected API host');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function audit(label, run) {
  try { console.log(JSON.stringify({ check: label, result: await run() })); }
  catch (error) { console.log(JSON.stringify({ check: label, error: error.message })); process.exitCode = 1; }
}
await audit('apiKeyRestrictions', async () => {
  const result = await read(`https://apikeys.googleapis.com/v2/projects/${projectNumber}/locations/global/keys?pageSize=100`);
  return { complete: !result.nextPageToken, keys: (result.keys ?? []).map(key => ({
    label: key.displayName,
    services: (key.restrictions?.apiTargets ?? []).map(target => target.service),
    applicationRestrictions: Object.keys(key.restrictions ?? {}).filter(key => key !== 'apiTargets'),
  })) };
});
for (const platform of ['android', 'ios', 'web']) {
  await audit(`${platform}AppCheck`, async () => {
    const result = await read(`https://firebase.googleapis.com/v1beta1/projects/${project}/${platform}Apps?pageSize=100`);
    const apps = [];
    for (const app of result.apps ?? []) {
      const providers = platform === 'android' ? ['playIntegrityConfig']
        : platform === 'ios' ? ['deviceCheckConfig'] : ['recaptchaV3Config', 'recaptchaEnterpriseConfig'];
      const configs = {};
      for (const provider of providers) {
        try {
          await read(`https://firebaseappcheck.googleapis.com/v1/projects/${projectNumber}/apps/${app.appId}/${provider}`);
          configs[provider] = 'configured';
        } catch (error) { configs[provider] = error.message; }
      }
      apps.push({ appId: app.appId, configs });
    }
    return { complete: !result.nextPageToken, apps };
  });
}
await audit('legacyPublicPlanPrivateFields', async () => {
  let pageToken;
  let scanned = 0;
  let affected = 0;
  const fieldCounts = {};
  const privateFields = new Set(['note', 'actualCost', 'completed', 'wallet', 'walletEntries', 'accommodationAddress']);
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/publicPlans`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('mask.fieldPaths', 'planData');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await read(url);
    for (const doc of data.documents ?? []) {
      scanned++;
      const found = new Set();
      function inspect(value) {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value.mapValue?.fields ?? {})) {
          if (privateFields.has(key)) found.add(key);
          inspect(child);
        }
        for (const child of value.arrayValue?.values ?? []) inspect(child);
      }
      inspect(doc.fields?.planData);
      if (found.size) affected++;
      for (const key of found) fieldCounts[key] = (fieldCounts[key] ?? 0) + 1;
    }
    pageToken = data.nextPageToken;
  } while (pageToken && scanned < 1000);
  return { scanned, complete: !pageToken, affected, fieldCounts };
});
await audit('storageDownloadTokens', async () => {
  let pageToken;
  let scanned = 0;
  let avatars = 0;
  let nonAvatarFiles = 0;
  let nonAvatarFilesWithDownloadTokens = 0;
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${project}.firebasestorage.app/o`);
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('fields', 'items(name,metadata),nextPageToken');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const result = await read(url);
    for (const item of result.items ?? []) {
      scanned++;
      if (/^users\/[^/]+\/avatar\.jpg$/.test(item.name)) avatars++;
      else {
        nonAvatarFiles++;
        if (item.metadata?.firebaseStorageDownloadTokens) nonAvatarFilesWithDownloadTokens++;
      }
    }
    pageToken = result.nextPageToken;
  } while (pageToken && scanned < 1000);
  return { scanned, complete: !pageToken, avatars, nonAvatarFiles, nonAvatarFilesWithDownloadTokens };
});
await audit('storageRulesRelease', async () => {
  const release = await read(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/firebase.storage/${project}.firebasestorage.app`);
  const rules = await read(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  const localContent = readFileSync(new URL('../storage.rules', import.meta.url), 'utf8');
  return { rulesetName: release.rulesetName, updateTime: release.updateTime,
    matchesLocal: rules.source?.files?.some(file =>
      file.name === 'storage.rules' && file.content.replace(/\r\n/g, '\n') === localContent.replace(/\r\n/g, '\n')) ?? false,
    files: (rules.source?.files ?? []).map(file => ({ name: file.name,
      sha256: createHash('sha256').update(file.content).digest('hex') })) };
});
await audit('functionsRelease', async () => {
  const results = [];
  for (const name of ['updatePrivacySettings', 'sharePublicPlan']) {
    const fn = await read(`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/europe-west1/functions/${name}`);
    results.push({ name, state: fn.state, updateTime: fn.updateTime,
      pushEnabled: fn.serviceConfig?.environmentVariables?.MOBILE_PUSH_ENABLED,
      proEnabled: fn.serviceConfig?.environmentVariables?.PRO_FEATURES_ENABLED,
    });
  }
  return results;
});
