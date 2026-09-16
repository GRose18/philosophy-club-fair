// Run with PLAYWRIGHT_MODULE pointing at an installed Playwright module.
import assert from 'node:assert/strict';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let role = 'Student',
  fail = false;
const items = [
  {
    id: 1,
    kind: 'resource',
    title: 'The original position',
    lessonTitle: 'What makes a society fair?',
    summary: 'Explore fairness through a thought experiment.',
    instructions: 'Read the introduction and bring one question.',
    sourceType: 'link',
    sourceUrl: 'https://plato.stanford.edu/entries/original-position/',
  },
  {
    id: 2,
    kind: 'video',
    title: 'Justice and the veil of ignorance',
    lessonTitle: 'What makes a society fair?',
    summary: 'A short introduction to Rawls.',
    sourceUrl: 'https://www.youtube.com/watch?v=example',
  },
  {
    id: 3,
    kind: 'worksheet',
    title: 'Prepare for discussion',
    lessonTitle: 'What makes a society fair?',
    introduction: 'Consider the following question.',
    questions: [
      {
        question:
          'What rules would you choose without knowing your place in society?',
        guidance: 'Consider who benefits.',
      },
    ],
  },
];
const messages = [];
await page.route(
  'https://philosophy-ews-api.onrender.com/**',
  async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data = {},
      status = 200;
    if (url.pathname === '/auth/me')
      data = { user: { role, username: 'test', fullName: 'Test Student' } };
    else if (url.pathname === '/content') {
      status = fail ? 503 : 200;
      data = fail ? { error: 'Temporarily unavailable' } : { items };
    } else if (url.pathname === '/admin/content') {
      data = { ok: true };
      const body = request.postDataJSON();
      assert.equal(body.lessonTitle, 'A shared lesson');
      assert.ok(body.title);
    } else if (url.pathname === '/inbox') {
      if (request.method() === 'POST') {
        messages.push({
          id: String(messages.length + 1),
          body: request.postDataJSON().body,
          name: role === 'Student' ? 'Test Student' : 'Club Admin',
          mine: true,
          createdAt: new Date().toISOString(),
        });
        data = { ok: true };
      } else
        data =
          role !== 'Student' && !url.searchParams.has('student')
            ? {
                threads: [
                  {
                    id: '1',
                    name: 'Test Student',
                    preview: 'Question about fairness',
                    updatedAt: new Date().toISOString(),
                  },
                ],
              }
            : { messages };
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  },
);
try {
  await page.goto('http://localhost:3001/student');
  await page
    .getByRole('heading', { name: 'What makes a society fair?' })
    .waitFor();
  assert.equal(await page.locator('.lesson-panel').count(), 1);
  assert.equal(await page.locator('.assignment-material').count(), 3);
  assert.equal(
    await page
      .getByRole('button', { name: /Harkness|Admin view|Student view/ })
      .count(),
    0,
  );
  await page.getByText('Explore worksheet').click();
  await page
    .getByText(
      'What rules would you choose without knowing your place in society?',
    )
    .waitFor({ state: 'visible' });
  await page.screenshot({
    path: 'outputs/student-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: 'outputs/student-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await page.getByLabel('Your message').fill('Question about fairness');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page
    .locator('.message p')
    .getByText('Question about fairness', { exact: true })
    .waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await page
    .locator('.message p')
    .getByText('Question about fairness', { exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Assignments', exact: true }).click();
  fail = true;
  await page.getByRole('button', { name: 'Refresh assignments' }).click();
  await page
    .getByRole('heading', { name: 'Couldn’t load assignments' })
    .waitFor();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page
    .getByRole('heading', { name: 'What makes a society fair?' })
    .waitFor();
  await page.goto('http://localhost:3001/');
  await page.waitForURL('**/student');
  role = 'Admin';
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3001/');
  await page.getByRole('button', { name: 'Resources', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Harkness', exact: true }).count(),
    0,
  );
  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  await page.getByLabel('Lesson name').fill('A shared lesson');
  await page.getByLabel('Resource URL').fill('https://plato.stanford.edu/');
  await page.getByLabel('Title', { exact: true }).fill('A reading');
  await page.getByLabel('Summary', { exact: true }).fill('Read this.');
  await page
    .getByLabel('Instructions', { exact: true })
    .fill('Bring a question.');
  await page
    .getByRole('button', { name: 'Publish to club', exact: true })
    .click();
  await page.getByRole('button', { name: 'Published', exact: true }).waitFor();
  await page.getByLabel('Title', { exact: true }).fill('A new reading');
  assert.ok(
    await page
      .getByRole('button', { name: 'Publish to club', exact: true })
      .isEnabled(),
  );
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await page.getByRole('button', { name: /Test Student/ }).click();
  await page.getByLabel('Your reply').fill('Consider the least advantaged.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page
    .locator('.message p')
    .getByText('Consider the least advantaged.', { exact: true })
    .waitFor();
  await page.screenshot({ path: 'outputs/admin-inbox.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: lesson grouping, worksheet, mobile width, student/admin inbox, refresh recovery, student redirect, admin Harkness isolation, publishing and draft edits.',
  );
} finally {
  await browser.close();
}
