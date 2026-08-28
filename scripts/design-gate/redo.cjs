const fs=require('fs');
const surface=process.argv[2];
const dir=`./.qa-design-gate/out-${surface}/`;
const ADMIN=['/admin','/admin/live','/admin/finance','/admin/reports','/admin/players','/admin/players/cohorts','/admin/markets','/admin/markets/new','/admin/resolver-queue','/admin/settlement','/admin/objections','/admin/proposals','/admin/candidates','/admin/ai-polls','/admin/ai-usage','/admin/sources','/admin/updown','/admin/updown/rounds','/admin/updown/proposals','/admin/payments','/admin/transactions','/admin/approvals','/admin/bonuses','/admin/affiliate','/admin/invites','/admin/compliance','/admin/aml','/admin/self-exclusions','/admin/privacy','/admin/retention','/admin/moderation','/admin/audit','/admin/events','/admin/system','/admin/config','/admin/insights','/admin/staff','/admin/roles','/admin/players/usr_db2d9a10eea039db7b75fa49','/admin/markets/mkt_eabfd67109bd1847d22a','/admin/resolver/mkt_3304bddfac93fcd99dc7','/admin/ai-polls/aipoll_c9e6d68510a524d9975e4dc5','/admin/staff/usr_1b3e6fd5048b1d873e931715','/admin/invites/inv_1087ae61eefb59e3443e'];
const PLAYER=['/','/markets','/updown','/live','/results','/leaderboard','/proposals','/fairness','/help','/legal/terms','/legal/privacy','/legal/responsible-gambling','/legal/aml','/wallet','/wallet/deposit','/wallet/withdraw','/positions','/positions/performance','/watchlist','/notifications','/updown/history','/proposals/new','/profile','/profile/account','/profile/activity','/profile/invite','/profile/kyc','/profile/notifications','/profile/responsible-gambling','/profile/security','/profile/sessions','/profile/source-of-funds','/markets/mkt_e56f1f14221a9e554a2a'];
const all=surface==='admin'?ADMIN:PLAYER;
const bad=/auth\/(admin|login)/;
const ok=new Set();
for (const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&!f.startsWith('_'))) { const r=JSON.parse(fs.readFileSync(dir+f,'utf8')); if (r.m1440 && !bad.test(r.finalUrl||'') && !r.error) ok.add(r.route); else fs.unlinkSync(dir+f); }
const redo=all.filter(r=>!ok.has(r));
console.error(`${surface}: OK ${ok.size} REDO ${redo.length}: ${redo.join(' ')}`);
process.stdout.write(redo.join(','));
