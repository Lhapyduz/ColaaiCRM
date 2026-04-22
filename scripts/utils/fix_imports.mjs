import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../../src');

const replacements = [
  { from: /@\/lib\/db/g, to: '@/infra/persistence/db' },
  { from: /@\/lib\/supabase/g, to: '@/infra/persistence/supabase' },
  { from: /@\/lib\/supabase-admin/g, to: '@/infra/persistence/supabase-admin' },
  { from: /@\/lib\/database.types/g, to: '@/infra/persistence/database.types' },
  { from: /@\/lib\/logger/g, to: '@/infra/logging/logger' },
  { from: /@\/lib\/actionLogger/g, to: '@/infra/logging/actionLogger' },
  { from: /@\/lib\/rateLimiter/g, to: '@/infra/security/rateLimiter' },
  { from: /@\/lib\/fingerprint/g, to: '@/infra/security/fingerprint' },
  { from: /@\/lib\/offlineSync/g, to: '@/services/sync/offlineSync' },
  { from: /@\/lib\/offlineStorage/g, to: '@/services/sync/offlineStorage' },
  { from: /@\/lib\/admin-auth/g, to: '@/services/auth/admin-auth' },
  { from: /@\/lib\/pinSecurity/g, to: '@/services/auth/pinSecurity' },
  { from: /@\/lib\/print/g, to: '@/services/print' },
  { from: /@\/lib\/salesPrediction/g, to: '@/services/ai/salesPrediction' },
  { from: /@\/lib\/dataAccess/g, to: '@/repositories/dataAccess' },
  { from: /@\/lib\/schemas/g, to: '@/types/schemas' },
  { from: /from '\.\.\/db'/g, to: "from '@/infra/persistence/db'" },
  { from: /from '\.\.\/supabase'/g, to: "from '@/infra/persistence/supabase'" },
  { from: /from '\.\.\/offlineStorage'/g, to: "from '@/services/sync/offlineStorage'" },
  { from: /from '\.\.\/offlineSync'/g, to: "from '@/services/sync/offlineSync'" },
  { from: /from '\.\.\/dataAccess'/g, to: "from '@/repositories/dataAccess'" },
  { from: /from '\.\.\/utils'/g, to: "from '@/utils/utils'" },
  { from: /from '\.\.\/sanitize'/g, to: "from '@/utils/sanitize'" },
  { from: /from '\.\.\/syncUtils'/g, to: "from '@/services/sync/syncUtils'" },
  { from: /@\/utils\/supabase\/middleware/g, to: '@/infra/persistence/supabase/middleware' },
  { from: /@\/utils\/supabase\/server/g, to: '@/infra/persistence/supabase/server' },
  { from: /@\/utils\/syncUtils/g, to: '@/services/sync/syncUtils' },
  { from: /@\/lib\/mock\/cardapio/g, to: '@/infra/mock/cardapio' },
  { from: /@\/services\/pix/g, to: '@/services/payments/pix' },
  { from: /@\/services\/pix-config/g, to: '@/services/payments/pix-config' },
  { from: /@\/services\/stripe/g, to: '@/services/payments/stripe' },
  { from: /@\/services\/abacatepay/g, to: '@/services/payments/abacatepay' },
  { from: /@\/services\/SubscriptionService/g, to: '@/services/payments/SubscriptionService' },
  { from: /@\/services\/telegram/g, to: '@/services/communication/telegram' },
  { from: /@\/services\/whatsapp/g, to: '@/services/communication/whatsapp' },
  { from: /@\/services\/pushNotification/g, to: '@/services/communication/pushNotification' },
  { from: /@\/services\/mesas/g, to: '@/services/business/mesas' },
  { from: /@\/services\/funcionariosDash/g, to: '@/services/business/funcionariosDash' },
  { from: /@\/services\/print/g, to: '@/services/business/print' },
  { from: /@\/stores\/useStorageStore/g, to: '@/infra/persistence/useStorageStore' },
];

console.log('Starting import fix Phase 3...');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walk(filepath, callback);
    } else if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      callback(filepath);
    }
  });
}

console.log('Starting import fix Phase 2...');

walk(srcRoot, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  replacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated: ${path.relative(srcRoot, filepath)}`);
  }
});

console.log('Finished!');
