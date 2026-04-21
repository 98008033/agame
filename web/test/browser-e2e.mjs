import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = '/tmp';
const results = [];

function screenshot(name) {
  return `${SCREENSHOT_DIR}/qa-${name}.png`;
}

async function testPage(page, path, pageName, checks = {}) {
  console.log(`\n[${pageName}] Testing ${path}...`);
  const pageResult = { name: pageName, path, errors: [], warnings: [], networkFailures: [], passed: true };
  const consoleErrors = [];
  const networkFails = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', req => {
    networkFails.push({ url: req.url(), error: req.failure()?.errorText || 'unknown' });
  });

  try {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000); // Let JS settle

    const status = response?.status() ?? 0;
    pageResult.status = status;

    if (status >= 400) {
      pageResult.errors.push(`HTTP ${status}`);
      pageResult.passed = false;
    }

    // Check page title / heading
    const title = await page.title();
    pageResult.title = title;

    // Check for visible body content
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) ?? '');
    pageResult.hasContent = bodyText.length > 10;
    if (!pageResult.hasContent) {
      pageResult.warnings.push('Page appears empty');
    }

    // Collect console errors
    await page.waitForTimeout(1000);
    pageResult.consoleErrors = consoleErrors;
    if (consoleErrors.length > 0) {
      pageResult.warnings.push(`${consoleErrors.length} console error(s)`);
    }

    // Network failures
    pageResult.networkFailures = networkFails;
    if (networkFails.length > 0) {
      pageResult.warnings.push(`${networkFails.length} network failure(s)`);
    }

    // Screenshot
    await page.screenshot({ path: screenshot(pageName.toLowerCase().replace(/\s+/g, '-')), fullPage: false });
    console.log(`  Status: ${status}, Title: "${title}", Content: ${bodyText.length > 0 ? 'yes' : 'no'}`);
    if (consoleErrors.length) console.log(`  Console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
    if (networkFails.length) console.log(`  Network fails: ${networkFails.slice(0, 3).map(f => f.url).join(', ')}`);

  } catch (err) {
    pageResult.errors.push(err.message);
    pageResult.passed = false;
    console.log(`  ERROR: ${err.message}`);
    try {
      await page.screenshot({ path: screenshot(`${pageName.toLowerCase().replace(/\s+/g, '-')}-error`), fullPage: false });
    } catch (_) {}
  }

  return pageResult;
}

async function main() {
  console.log('=== Agame Browser E2E Test ===');
  console.log(`Base URL: ${BASE}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });

  // ===== Phase 1: Test all individual pages =====
  console.log('\n--- Phase 1: Page Rendering Tests ---');

  const pages = [
    { path: '/login', name: 'Login' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/game', name: 'Game' },
    { path: '/status', name: 'Status' },
    { path: '/news', name: 'News' },
    { path: '/plan', name: 'Today Plan' },
    { path: '/create', name: 'Character Create' },
    { path: '/admin', name: 'Admin' },
    { path: '/death', name: 'Death Narrative' },
  ];

  for (const p of pages) {
    const page = await context.newPage();
    const result = await testPage(page, p.path, p.name);
    results.push(result);
    await page.close();
  }

  // ===== Phase 2: Auth Flow Test =====
  console.log('\n--- Phase 2: Auth Flow Test ---');

  const authPage = await context.newPage();
  const authResult = { name: 'Auth Flow', path: '/login', errors: [], warnings: [], networkFailures: [], passed: true };

  try {
    await authPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await authPage.waitForTimeout(2000);

    // Try to find register/login buttons or forms
    const pageText = await authPage.evaluate(() => document.body?.innerText ?? '');
    authResult.hasLoginForm = pageText.includes('登录') || pageText.includes('Login') || pageText.includes('注册') || pageText.includes('Register') || pageText.includes('guest') || pageText.includes('Guest');

    // Screenshot login page
    await authPage.screenshot({ path: screenshot('auth-login'), fullPage: false });

    // Try clicking any register or guest button
    const guestBtn = await authPage.locator('button:has-text("guest"), button:has-text("Guest"), button:has-text("游客"), button:has-text("注册")').first();
    if (await guestBtn.isVisible().catch(() => false)) {
      console.log('  Found guest/register button, clicking...');
      await guestBtn.click();
      await authPage.waitForTimeout(3000);
      authResult.loggedIn = true;
      await authPage.screenshot({ path: screenshot('auth-after-click'), fullPage: false });
    } else {
      authResult.warnings.push('No guest/register button found on login page');
    }

    // Check if we navigated to dashboard after login
    const currentUrl = authPage.url();
    authResult.currentUrl = currentUrl;
    console.log(`  Current URL after login attempt: ${currentUrl}`);

  } catch (err) {
    authResult.errors.push(err.message);
    authResult.passed = false;
    console.log(`  Auth flow error: ${err.message}`);
  }

  results.push(authResult);
  await authPage.close();

  // ===== Phase 3: Navigation Test =====
  console.log('\n--- Phase 3: Navigation Test ---');

  const navPage = await context.newPage();
  const navResult = { name: 'Navigation', path: '/', errors: [], warnings: [], networkFailures: [], passed: true };

  const navLinks = [
    { text: '登录', path: '/login' },
    { text: 'Login', path: '/login' },
    { text: 'Dashboard', path: '/dashboard' },
    { text: '游戏', path: '/game' },
    { text: 'Game', path: '/game' },
    { text: '状态', path: '/status' },
    { text: '新闻', path: '/news' },
    { text: 'News', path: '/news' },
    { text: '计划', path: '/plan' },
    { text: '管理', path: '/admin' },
    { text: 'Admin', path: '/admin' },
  ];

  try {
    await navPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await navPage.waitForTimeout(2000);

    const bodyText = await navPage.evaluate(() => document.body?.innerText ?? '');
    navResult.hasContent = bodyText.length > 10;

    // Find all links
    const links = await navPage.$$eval('a', els => els.map(a => ({ text: a.innerText.trim(), href: a.href })));
    navResult.foundLinks = links.filter(l => l.text.length > 0);
    console.log(`  Found ${navResult.foundLinks.length} links on home page`);

    // Try clicking a few links
    let clicksOk = 0;
    for (const link of navLinks) {
      try {
        const el = navPage.locator(`a:has-text("${link.text}")`).first();
        if (await el.isVisible().catch(() => false)) {
          await el.click();
          await navPage.waitForTimeout(1500);
          clicksOk++;
          await navPage.goBack();
          await navPage.waitForTimeout(500);
        }
      } catch (_) {}
    }
    navResult.navigationClicksOk = clicksOk;
    console.log(`  Successfully navigated ${clicksOk} links`);

    await navPage.screenshot({ path: screenshot('navigation-home'), fullPage: false });

  } catch (err) {
    navResult.errors.push(err.message);
    navResult.passed = false;
    console.log(`  Navigation error: ${err.message}`);
  }

  results.push(navResult);
  await navPage.close();

  // ===== Phase 4: Router/404 Test =====
  console.log('\n--- Phase 4: 404/Router Test ---');

  const routerPage = await context.newPage();
  const routerResult = { name: 'Router/404', path: '/nonexistent', errors: [], warnings: [], networkFailures: [], passed: true };

  try {
    const response = await routerPage.goto(`${BASE}/nonexistent-page-xyz`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await routerPage.waitForTimeout(1000);
    routerResult.status = response?.status() ?? 0;
    const bodyText = await routerPage.evaluate(() => document.body?.innerText ?? '');
    routerResult.isSPARoute = bodyText.includes('404') || bodyText.includes('not found') || bodyText.includes('不存在') || response?.status() === 200;
    console.log(`  /nonexistent-page-xyz -> status: ${routerResult.status}, SPA handled: ${routerResult.isSPARoute}`);
    await routerPage.screenshot({ path: screenshot('404-test'), fullPage: false });
  } catch (err) {
    routerResult.errors.push(err.message);
    console.log(`  Router test error: ${err.message}`);
  }

  results.push(routerResult);
  await routerPage.close();

  // ===== Generate Summary =====
  console.log('\n=== Test Summary ===');

  let totalPass = 0;
  let totalFail = 0;

  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    if (r.passed) totalPass++; else totalFail++;
    console.log(`  [${status}] ${r.name} (${r.path})`);
    if (r.warnings.length > 0) {
      for (const w of r.warnings) {
        console.log(`    ⚠ ${w}`);
      }
    }
    if (r.errors.length > 0) {
      for (const e of r.errors) {
        console.log(`    ✗ ${e}`);
      }
    }
  }

  console.log(`\nTotal: ${totalPass} passed, ${totalFail} failed out of ${results.length} tests`);

  // Write report
  const report = generateReport(results);
  writeFileSync('/Users/hyc/Documents/agame/QA_REPORT.md', report, 'utf8');
  console.log('\nReport written to /Users/hyc/Documents/agame/QA_REPORT.md');

  await browser.close();
}

function generateReport(results) {
  const now = new Date().toISOString();
  let md = `# QA Browser Test Report\n\nGenerated: ${now}\n\n`;

  md += '## Summary\n\n';
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  md += `| Metric | Count |\n|--------|-------|\n`;
  md += `| Total Tests | ${results.length} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Failed | ${failed} |\n\n`;

  md += '## Per-Page Results\n\n';

  for (const r of results) {
    md += `### ${r.name} (\`${r.path}\`)\n\n`;
    md += `- **Status**: ${r.passed ? 'PASS' : 'FAIL'}\n`;
    if (r.status) md += `- **HTTP Status**: ${r.status}\n`;
    if (r.title) md += `- **Page Title**: "${r.title}"\n`;
    if (r.hasContent !== undefined) md += `- **Has Content**: ${r.hasContent ? 'Yes' : 'No'}\n`;

    if (r.consoleErrors && r.consoleErrors.length > 0) {
      md += `- **Console Errors** (${r.consoleErrors.length}):\n`;
      for (const e of r.consoleErrors.slice(0, 10)) {
        md += `  - \`${e.substring(0, 150)}\`\n`;
      }
    }

    if (r.networkFailures && r.networkFailures.length > 0) {
      md += `- **Network Failures**:\n`;
      for (const f of r.networkFailures) {
        md += `  - ${f.url} → ${f.error}\n`;
      }
    }

    if (r.warnings && r.warnings.length > 0) {
      md += `- **Warnings**:\n`;
      for (const w of r.warnings) {
        md += `  - ${w}\n`;
      }
    }

    if (r.errors && r.errors.length > 0) {
      md += `- **Errors**:\n`;
      for (const e of r.errors) {
        md += `  - ${e}\n`;
      }
    }

    if (r.foundLinks && r.foundLinks.length > 0) {
      md += `- **Links Found** (${r.foundLinks.length}):\n`;
      for (const l of r.foundLinks.slice(0, 20)) {
        md += `  - "${l.text}" → ${l.href}\n`;
      }
    }

    if (r.navigationClicksOk !== undefined) {
      md += `- **Navigation Clicks OK**: ${r.navigationClicksOk}\n`;
    }

    const screenshotName = `qa-${r.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    md += `- **Screenshot**: \`/tmp/${screenshotName}\`\n\n`;
  }

  md += '## Screenshots\n\nAll screenshots saved to `/tmp/qa-*.png`\n\n';
  md += '| Page | Screenshot |\n|------|------------|\n';
  for (const r of results) {
    const sn = r.name.toLowerCase().replace(/\s+/g, '-');
    md += `| ${r.name} | \`/tmp/qa-${sn}.png\` |\n`;
  }

  md += '\n## Recommendations\n\n';
  const issues = results.filter(r => !r.passed || (r.warnings && r.warnings.length > 0));
  if (issues.length === 0) {
    md += 'All pages loaded without critical errors.\n';
  } else {
    for (const r of issues) {
      if (!r.passed) {
        md += `- **${r.name}**: Failed - ${r.errors.join('; ')}\n`;
      } else if (r.warnings) {
        md += `- **${r.name}**: Warnings - ${r.warnings.join('; ')}\n`;
      }
    }
  }

  return md;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
