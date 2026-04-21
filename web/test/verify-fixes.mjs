import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = '/tmp';
const results = [];

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/qa-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function main() {
  console.log('=== QA Fix Verification ===\n');

  const browser = await chromium.launch({ headless: true });

  // ===== Fix 1: /character/create route =====
  console.log('--- Fix 1: /character/create route ---');
  const createPage = await browser.newContext().then(c => c.newPage());
  const fix1 = { name: 'Create Character Route', path: '/character/create', passed: false, errors: [], notes: '' };

  try {
    const consoleErrors = [];
    createPage.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const response = await createPage.goto(`${BASE}/character/create`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await createPage.waitForTimeout(2000);

    fix1.status = response?.status() ?? 0;
    const bodyText = await createPage.evaluate(() => document.body?.innerText ?? '');
    fix1.hasContent = bodyText.length > 50;
    fix1.consoleErrors = consoleErrors;

    // Check for key content
    const hasFactionSelect = bodyText.includes('阵营') || bodyText.includes('苍龙') || bodyText.includes('选择');
    const hasOriginSelect = bodyText.includes('出身') || bodyText.includes('背景') || bodyText.includes('创建');
    fix1.hasFactionSelect = hasFactionSelect;
    fix1.hasOriginSelect = hasOriginSelect;
    fix1.hasSubmitButton = bodyText.includes('创建角色') || bodyText.includes('创建') || bodyText.includes('Submit');

    fix1.passed = fix1.hasContent && (hasFactionSelect || hasOriginSelect);

    console.log(`  Status: ${fix1.status}, Content: ${bodyText.length} chars`);
    console.log(`  Has faction select: ${hasFactionSelect}`);
    console.log(`  Has origin select: ${hasOriginSelect}`);
    console.log(`  Has submit button: ${fix1.hasSubmitButton}`);
    console.log(`  Console errors: ${consoleErrors.length}`);

    await screenshot(createPage, 'verify-create-route');
    fix1.screenshot = '/tmp/qa-verify-create-route.png';
  } catch (err) {
    fix1.errors.push(err.message);
    console.log(`  ERROR: ${err.message}`);
  }
  results.push(fix1);
  await createPage.close();

  // ===== Fix 2: /create still works (old route should redirect or still work) =====
  console.log('\n--- Fix 2a: /create route (back compat) ---');
  const compatPage = await browser.newContext().then(c => c.newPage());
  const fix2a = { name: 'Create Route Compat', path: '/create', passed: false, errors: [], notes: '' };

  try {
    const response = await compatPage.goto(`${BASE}/create`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await compatPage.waitForTimeout(2000);
    fix2a.status = response?.status() ?? 0;
    const bodyText = await compatPage.evaluate(() => document.body?.innerText ?? '');
    fix2a.hasContent = bodyText.length > 50;
    fix2a.passed = fix2a.hasContent;
    console.log(`  Status: ${fix2a.status}, Content: ${bodyText.length} chars`);
    await screenshot(compatPage, 'verify-create-backcompat');
    fix2a.screenshot = '/tmp/qa-verify-create-backcompat.png';
  } catch (err) {
    fix2a.errors.push(err.message);
    console.log(`  ERROR: ${err.message}`);
  }
  results.push(fix2a);
  await compatPage.close();

  // ===== Fix 2: WebSocket - no notification spam =====
  console.log('\n--- Fix 2: WebSocket notification spam ---');
  const wsPage = await browser.newContext().then(c => c.newPage());
  const fix2 = { name: 'WebSocket Notification Spam', path: '/dashboard', passed: false, errors: [], notes: '' };

  try {
    const notifications = [];
    const consoleErrors = [];

    wsPage.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Listen for notification toasts appearing
    wsPage.on('request', req => {
      // track requests
    });

    const response = await wsPage.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wsPage.waitForTimeout(3000); // Wait longer for any notification spam

    // Count notification toasts in the DOM
    const notificationCount = await wsPage.evaluate(() => {
      const toasts = document.querySelectorAll('[class*="notif"], [class*="toast"], [class*="Notification"], [role="alert"]');
      return toasts.length;
    });

    // Check for visible notification elements
    const notificationTexts = await wsPage.evaluate(() => {
      const alerts = document.querySelectorAll('[role="alert"], [class*="alert"], [class*="toast"]');
      return Array.from(alerts).map(el => el.textContent?.substring(0, 100));
    });

    fix2.status = response?.status() ?? 0;
    fix2.notificationCount = notificationCount;
    fix2.notificationTexts = notificationTexts;
    fix2.consoleErrors = consoleErrors;
    const wsErrors = consoleErrors.filter(e => e.includes('WebSocket') || e.includes('ws://'));
    fix2.wsErrors = wsErrors;

    // Pass if no notification spam (0-1 notifications is fine, 200+ is the bug)
    fix2.passed = notificationCount < 10;

    console.log(`  Status: ${fix2.status}`);
    console.log(`  Notification elements: ${notificationCount}`);
    console.log(`  Notification texts: ${notificationTexts.slice(0, 3).join(', ')}`);
    console.log(`  WebSocket console errors: ${wsErrors.length}`);
    console.log(`  Total console errors: ${consoleErrors.length}`);

    await screenshot(wsPage, 'verify-ws-notifications');
    fix2.screenshot = '/tmp/qa-verify-ws-notifications.png';
  } catch (err) {
    fix2.errors.push(err.message);
    console.log(`  ERROR: ${err.message}`);
  }
  results.push(fix2);
  await wsPage.close();

  // ===== Fix 3: WebSocket server connection test =====
  console.log('\n--- Fix 3: WebSocket server connection ---');
  const wsTestPage = await browser.newContext().then(c => c.newPage());
  const fix3 = { name: 'WebSocket Server Connection', path: 'ws://localhost:3000/ws', passed: false, errors: [], notes: '' };

  try {
    // Test WebSocket connection via page evaluate
    const wsResult = await wsTestPage.evaluate(() => {
      return new Promise((resolve) => {
        const results = { connected: false, error: null, messages: [] };
        try {
          const ws = new WebSocket('ws://localhost:3000/ws');

          ws.onopen = () => {
            results.connected = true;
            ws.send(JSON.stringify({ type: 'ping' }));
          };

          ws.onmessage = (event) => {
            results.messages.push(event.data.substring(0, 200));
          };

          ws.onerror = (event) => {
            results.error = 'WebSocket error event';
          };

          ws.onclose = (event) => {
            results.closeCode = event.code;
            results.closeReason = event.reason;
            resolve(results);
          };

          // Timeout after 5 seconds
          setTimeout(() => {
            if (!results.connected) {
              ws.close();
              resolve(results);
            }
          }, 5000);
        } catch (e) {
          results.error = e.message;
          resolve(results);
        }
      });
    });

    fix3.wsConnected = wsResult.connected;
    fix3.wsError = wsResult.error;
    fix3.wsMessages = wsResult.messages;
    fix3.wsCloseCode = wsResult.closeCode;
    fix3.wsCloseReason = wsResult.closeReason;
    fix3.passed = wsResult.connected;

    console.log(`  Connected: ${wsResult.connected}`);
    console.log(`  Error: ${wsResult.error || 'none'}`);
    console.log(`  Messages received: ${wsResult.messages.length}`);
    console.log(`  Close code: ${wsResult.closeCode || 'N/A'}`);

    fix3.screenshot = '/tmp/qa-verify-ws-connection.png';
  } catch (err) {
    fix3.errors.push(err.message);
    console.log(`  ERROR: ${err.message}`);
  }
  results.push(fix3);
  await wsTestPage.close();

  // ===== Fix 4: components/index.ts exports =====
  console.log('\n--- Fix 4: components/index.ts exports ---');
  const compPage = await browser.newContext().then(c => c.newPage());
  const fix4 = { name: 'Component Exports', path: '/dashboard', passed: false, errors: [], notes: '' };

  try {
    const consoleErrors = [];
    compPage.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const response = await compPage.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await compPage.waitForTimeout(2000);

    fix4.status = response?.status() ?? 0;
    fix4.consoleErrors = consoleErrors;

    // Check for module/component import errors
    const importErrors = consoleErrors.filter(e =>
      e.includes('export') || e.includes('not found') || e.includes('cannot find') ||
      e.includes('Module') || e.includes('import') || e.includes('undefined')
    );

    fix4.importErrors = importErrors;
    fix4.passed = importErrors.length === 0;

    console.log(`  Status: ${fix4.status}`);
    console.log(`  Total console errors: ${consoleErrors.length}`);
    console.log(`  Import/export errors: ${importErrors.length}`);
    if (importErrors.length > 0) {
      console.log(`  Import errors: ${importErrors.slice(0, 5).join(' | ')}`);
    }

    await screenshot(compPage, 'verify-component-exports');
    fix4.screenshot = '/tmp/qa-verify-component-exports.png';
  } catch (err) {
    fix4.errors.push(err.message);
    console.log(`  ERROR: ${err.message}`);
  }
  results.push(fix4);
  await compPage.close();

  // ===== Summary =====
  console.log('\n=== Verification Summary ===');
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    if (r.passed) passCount++; else failCount++;
    console.log(`  [${status}] ${r.name} (${r.path})`);
    if (r.errors.length > 0) {
      for (const e of r.errors) console.log(`    ✗ ${e}`);
    }
  }

  console.log(`\nTotal: ${passCount} passed, ${failCount} failed out of ${results.length} tests`);

  // Write verification report
  const report = generateVerificationReport(results);
  writeFileSync('/Users/hyc/Documents/agame/QA_VERIFICATION_REPORT.md', report, 'utf8');
  console.log('\nVerification report written to /Users/hyc/Documents/agame/QA_VERIFICATION_REPORT.md');

  await browser.close();
}

function generateVerificationReport(results) {
  const now = new Date().toISOString();
  let md = `# QA Fix Verification Report\n\nGenerated: ${now}\n\n`;

  md += '## Summary\n\n';
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  md += `| Fix | Status | Details |\n|-----|--------|--------|\n`;

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    let detail = '';
    if (r.name === 'Create Character Route') {
      detail = `Content: ${r.hasContent ? 'yes' : 'no'}, Faction: ${r.hasFactionSelect ? 'yes' : 'no'}, Origin: ${r.hasOriginSelect ? 'yes' : 'no'}`;
    } else if (r.name === 'Create Route Compat') {
      detail = `Content: ${r.hasContent ? 'yes' : 'no'}`;
    } else if (r.name === 'WebSocket Notification Spam') {
      detail = `Notifications: ${r.notificationCount}, WS errors: ${r.wsErrors?.length || 0}`;
    } else if (r.name === 'WebSocket Server Connection') {
      detail = `Connected: ${r.wsConnected}, Error: ${r.wsError || 'none'}, Close code: ${r.wsCloseCode || 'N/A'}`;
    } else if (r.name === 'Component Exports') {
      detail = `Import errors: ${r.importErrors?.length || 0}, Total console errors: ${r.consoleErrors?.length || 0}`;
    }
    md += `| ${icon} ${r.name} | ${r.passed ? 'PASS' : 'FAIL'} | ${detail} |\n`;
  }

  md += `\n**${passed}/${results.length} fixes verified**\n\n`;

  md += '## Detailed Results\n\n';

  for (const r of results) {
    md += `### ${r.name}\n\n`;
    md += `- **Status**: ${r.passed ? 'PASS ✅' : 'FAIL ❌'}\n`;
    md += `- **Path**: ${r.path}\n`;

    if (r.status) md += `- **HTTP Status**: ${r.status}\n`;
    if (r.hasContent !== undefined) md += `- **Has Content**: ${r.hasContent ? 'Yes' : 'No'}\n`;
    if (r.hasFactionSelect !== undefined) md += `- **Has Faction Select**: ${r.hasFactionSelect ? 'Yes' : 'No'}\n`;
    if (r.hasOriginSelect !== undefined) md += `- **Has Origin Select**: ${r.hasOriginSelect ? 'Yes' : 'No'}\n`;
    if (r.hasSubmitButton !== undefined) md += `- **Has Submit Button**: ${r.hasSubmitButton ? 'Yes' : 'No'}\n`;
    if (r.notificationCount !== undefined) md += `- **Notification Count**: ${r.notificationCount}\n`;
    if (r.wsConnected !== undefined) md += `- **WS Connected**: ${r.wsConnected ? 'Yes' : 'No'}\n`;
    if (r.wsError) md += `- **WS Error**: ${r.wsError}\n`;
    if (r.wsCloseCode) md += `- **WS Close Code**: ${r.wsCloseCode}\n`;
    if (r.wsCloseReason) md += `- **WS Close Reason**: ${r.wsCloseReason}\n`;

    if (r.notificationTexts && r.notificationTexts.length > 0) {
      md += `- **Notification Texts**: ${r.notificationTexts.join(', ')}\n`;
    }

    if (r.consoleErrors && r.consoleErrors.length > 0) {
      md += `- **Console Errors** (${r.consoleErrors.length}):\n`;
      for (const e of r.consoleErrors.slice(0, 10)) {
        md += `  - \`${e.substring(0, 200)}\`\n`;
      }
    }

    if (r.importErrors && r.importErrors.length > 0) {
      md += `- **Import/Export Errors**:\n`;
      for (const e of r.importErrors) {
        md += `  - \`${e.substring(0, 200)}\`\n`;
      }
    }

    if (r.wsMessages && r.wsMessages.length > 0) {
      md += `- **WS Messages Received**:\n`;
      for (const m of r.wsMessages) {
        md += `  - \`${m.substring(0, 200)}\`\n`;
      }
    }

    if (r.errors.length > 0) {
      md += `- **Test Errors**:\n`;
      for (const e of r.errors) md += `  - ${e}\n`;
    }

    md += `- **Screenshot**: \`${r.screenshot}\`\n\n`;
  }

  md += '## Screenshots\n\n';
  md += '| Fix | Screenshot |\n|-----|------------|\n';
  for (const r of results) {
    const name = r.name.toLowerCase().replace(/[\s\/]+/g, '-');
    md += `| ${r.name} | \`${r.screenshot}\` |\n`;
  }

  return md;
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
