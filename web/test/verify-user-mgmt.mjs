import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const API = 'http://127.0.0.1:3000/v1';
const WEB = 'http://localhost:5173';
const ADMIN_SECRET = 'admin_secret_key_mvp';
const results = [];

async function screenshot(page, name) {
  const path = `/tmp/qa-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

// Navigate to /admin with proper token setup (full page reload needed)
async function navigateToAdmin(page) {
  await page.goto(WEB + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((secret) => { localStorage.setItem('auth_token', secret); }, ADMIN_SECRET);
  await page.evaluate(() => { window.location.href = '/admin'; });
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(3000);
}

async function main() {
  console.log('=== User Management Feature Verification ===\n');

  // ===== Test 1: Admin page requires auth =====
  console.log('--- Test 1: Admin page auth protection ---');
  const noAuthCtx = await chromium.launch({ headless: true }).then(b => b.newContext());
  const noAuthPage = await noAuthCtx.newPage();
  const test1 = { name: 'Admin Auth Protection', path: '/admin (unauthenticated)', passed: false, errors: [], notes: '' };

  try {
    await noAuthPage.goto(WEB + '/login', { waitUntil: 'domcontentloaded' });
    await noAuthPage.evaluate(() => { localStorage.removeItem('auth_token'); });
    await noAuthPage.goto(WEB + '/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await noAuthPage.waitForTimeout(3000);

    const bodyText = await noAuthPage.evaluate(() => document.body?.innerText ?? '');
    test1.showsAuthError = bodyText.includes('访问被拒绝') || bodyText.includes('401');
    test1.passed = test1.showsAuthError;

    console.log(`  Shows auth error: ${test1.showsAuthError}`);
    await screenshot(noAuthPage, 'verify-admin-auth');
    test1.screenshot = '/tmp/qa-verify-admin-auth.png';
  } catch (err) {
    test1.errors.push(err.message);
  }
  results.push(test1);
  await noAuthPage.close();
  await noAuthCtx.close();

  // ===== Test 2: Admin page works with auth =====
  console.log('\n--- Test 2: Admin page with auth ---');
  const authCtx = await chromium.launch({ headless: true }).then(b => b.newContext());
  const authPage = await authCtx.newPage();
  const test2 = { name: 'Admin Page Access', path: '/admin (authenticated)', passed: false, errors: [], notes: '' };

  try {
    await navigateToAdmin(authPage);

    const bodyText = await authPage.evaluate(() => document.body?.innerText ?? '');
    test2.hasSystemStatus = bodyText.includes('系统状态');
    test2.hasUsersTab = bodyText.includes('用户管理');
    test2.hasLLMConfig = bodyText.includes('LLM配置');
    test2.passed = test2.hasSystemStatus && test2.hasUsersTab;

    console.log(`  System status tab: ${test2.hasSystemStatus}`);
    console.log(`  Users tab: ${test2.hasUsersTab}`);
    console.log(`  LLM config tab: ${test2.hasLLMConfig}`);
    await screenshot(authPage, 'verify-admin-access');
    test2.screenshot = '/tmp/qa-verify-admin-access.png';
  } catch (err) {
    test2.errors.push(err.message);
  }
  results.push(test2);
  await authPage.close();
  await authCtx.close();

  // ===== Test 3: Ban user via API =====
  console.log('\n--- Test 3: Ban user via API ---');
  const test3 = { name: 'Ban User API', path: 'POST /admin/users/:id/ban', passed: false, errors: [] };

  try {
    // Create fresh test user
    const testUser = `ban_api_test_${Date.now()}`;
    const regRes = await fetch(API + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: 'pass123456', name: 'BanApiTest' })
    });
    const regJson = await regRes.json();

    if (!regJson.success || !regJson.data?.player) {
      test3.errors.push('Failed to create test user');
    } else {
      const userId = regJson.data.player.id;
      test3.targetUser = { id: userId, name: testUser };

      // Ban the user
      const banRes = await fetch(API + `/admin/users/${userId}/ban`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${ADMIN_SECRET}`, 'Content-Type': 'application/json' }
      });
      const banJson = await banRes.json();
      test3.banStatus = banRes.status;

      // Verify banned
      const detailRes = await fetch(API + `/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${ADMIN_SECRET}` }
      });
      const detailJson = await detailRes.json();
      test3.userBanned = detailJson.data?.player?.banned;
      test3.passed = banRes.status === 200 && test3.userBanned === true;

      console.log(`  Created: ${testUser} (${userId})`);
      console.log(`  Ban status: ${banRes.status}`);
      console.log(`  User banned: ${test3.userBanned}`);
    }
  } catch (err) {
    test3.errors.push(err.message);
  }
  results.push(test3);

  // ===== Test 4: Banned user cannot login =====
  console.log('\n--- Test 4: Banned user cannot login ---');
  const test4 = { name: 'Banned User Login Blocked', path: 'POST /auth/login', passed: false, errors: [] };

  try {
    const testUser = `ban_login_test_${Date.now()}`;

    // Create + ban + login in sequence
    const regRes = await fetch(API + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: 'pass123456', name: 'BanLoginTest' })
    });
    const regJson = await regRes.json();

    if (!regJson.success) {
      test4.errors.push('Failed to create test user');
    } else {
      const userId = regJson.data.player.id;

      // Ban
      await fetch(API + `/admin/users/${userId}/ban`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${ADMIN_SECRET}`, 'Content-Type': 'application/json' }
      });

      // Verify banned
      const vRes = await fetch(API + `/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${ADMIN_SECRET}` }
      });
      const vJson = await vRes.json();
      test4.userBanned = vJson.data?.player?.banned;

      // Try login
      const loginRes = await fetch(API + '/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser, password: 'pass123456' })
      });
      const loginJson = await loginRes.json();

      test4.loginStatus = loginRes.status;
      test4.errorCode = loginJson.error?.code;
      test4.passed = loginRes.status === 403 && loginJson.error?.code === 'ACCOUNT_BANNED';

      console.log(`  User banned: ${test4.userBanned}`);
      console.log(`  Login status: ${loginRes.status}`);
      console.log(`  Error code: ${loginJson.error?.code || 'N/A'}`);
      console.log(`  Is blocked: ${test4.passed}`);
    }
  } catch (err) {
    test4.errors.push(err.message);
  }
  results.push(test4);

  // ===== Test 5: Admin UI - user management tab with ban/delete buttons =====
  console.log('\n--- Test 5: Admin user management UI ---');
  const uiCtx = await chromium.launch({ headless: true }).then(b => b.newContext());
  const uiPage = await uiCtx.newPage();
  const test5 = { name: 'Admin User Management UI', path: '/admin → users tab', passed: false, errors: [] };

  try {
    await navigateToAdmin(uiPage);

    // Click users tab
    const usersTab = uiPage.locator('button:has-text("用户管理")').first();
    if (await usersTab.isVisible().catch(() => false)) {
      await usersTab.click();
      await uiPage.waitForTimeout(2000);
    }

    const bodyText = await uiPage.evaluate(() => document.body?.innerText ?? '');
    test5.hasTableHeaders = bodyText.includes('名称') && bodyText.includes('操作');
    test5.hasBanButton = bodyText.includes('封禁') || bodyText.includes('解除');
    test5.hasDeleteButton = bodyText.includes('删除');
    test5.hasUserList = bodyText.includes('用户列表') || bodyText.includes('总数');
    test5.hasBannedStatus = bodyText.includes('已封禁') || bodyText.includes('正常');
    test5.passed = test5.hasUserList && (test5.hasBanButton || test5.hasDeleteButton);

    console.log(`  Has table: ${test5.hasTableHeaders}`);
    console.log(`  Has ban button: ${test5.hasBanButton}`);
    console.log(`  Has delete button: ${test5.hasDeleteButton}`);
    console.log(`  Has user list: ${test5.hasUserList}`);
    console.log(`  Has banned status: ${test5.hasBannedStatus}`);
    await screenshot(uiPage, 'verify-admin-users-ui');
    test5.screenshot = '/tmp/qa-verify-admin-users-ui.png';
  } catch (err) {
    test5.errors.push(err.message);
  }
  results.push(test5);
  await uiPage.close();
  await uiCtx.close();

  // ===== Summary =====
  console.log('\n=== Summary ===');
  let passCount = 0, failCount = 0;
  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    if (r.passed) passCount++; else failCount++;
    console.log(`  [${status}] ${r.name}`);
    for (const e of r.errors) console.log(`    ✗ ${e}`);
  }
  console.log(`\nTotal: ${passCount}/${results.length} passed`);

  // Write report
  const report = generateReport(results);
  writeFileSync('/Users/hyc/Documents/agame/QA_USER_MGMT_REPORT.md', report, 'utf8');
  console.log('\nReport: /Users/hyc/Documents/agame/QA_USER_MGMT_REPORT.md');
}

function generateReport(results) {
  const now = new Date().toISOString();
  let md = `# User Management Feature Verification\n\nGenerated: ${now}\n\n`;
  const passed = results.filter(r => r.passed).length;
  md += `## Summary: ${passed}/${results.length} tests passed\n\n`;
  md += `| Test | Status | Details |\n|------|--------|--------|\n`;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    let d = '';
    if (r.banStatus) d = `Ban: ${r.banStatus}, Banned: ${r.userBanned}`;
    if (r.loginStatus) d = `Login: ${r.loginStatus}, Code: ${r.errorCode || 'N/A'}`;
    if (r.hasBanButton !== undefined) d = `Ban btn: ${r.hasBanButton}, Delete: ${r.hasDeleteButton}`;
    md += `| ${icon} ${r.name} | ${r.passed ? 'PASS' : 'FAIL'} | ${d} |\n`;
  }
  md += '\n## Detailed Results\n\n';
  for (const r of results) {
    md += `### ${r.name}\n\n`;
    md += `- **Status**: ${r.passed ? 'PASS ✅' : 'FAIL ❌'}\n`;
    if (r.banStatus !== undefined) md += `- **Ban API Status**: ${r.banStatus}\n`;
    if (r.userBanned !== undefined) md += `- **User Banned**: ${r.userBanned}\n`;
    if (r.loginStatus !== undefined) md += `- **Login Status**: ${r.loginStatus}\n`;
    if (r.errorCode !== undefined) md += `- **Login Error Code**: ${r.errorCode}\n`;
    if (r.hasBanButton !== undefined) {
      md += `- **Has Ban Button**: ${r.hasBanButton}\n`;
      md += `- **Has Delete Button**: ${r.hasDeleteButton}\n`;
      md += `- **Has User List**: ${r.hasUserList}\n`;
      md += `- **Has Banned Status Badge**: ${r.hasBannedStatus}\n`;
    }
    if (r.showsAuthError !== undefined) md += `- **Shows Auth Error**: ${r.showsAuthError}\n`;
    if (r.hasSystemStatus !== undefined) md += `- **Has System Status Tab**: ${r.hasSystemStatus}\n`;
    if (r.hasUsersTab !== undefined) md += `- **Has Users Tab**: ${r.hasUsersTab}\n`;
    if (r.errors.length) { for (const e of r.errors) md += `  - ${e}\n`; }
    md += `- **Screenshot**: \`${r.screenshot || 'N/A'}\`\n\n`;
  }
  return md;
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
