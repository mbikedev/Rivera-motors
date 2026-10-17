import { expect, test, type Page } from '@playwright/test';

/** Clicks a language link; on small screens it lives in the menu. */
async function switchLanguage(page: Page, name: string, menuLabel: RegExp) {
  const visible = page.getByRole('link', { name }).filter({ visible: true });
  if ((await visible.count()) === 0) await page.getByRole('button', { name: menuLabel }).click();
  await visible.first().click();
}

const FORBIDDEN =
  /warenkorb|in den warenkorb|jetzt kaufen|zur kasse|checkout|add to cart|buy now|panier|acheter maintenant|auktion|auction|enchère|finanzierung|financing|financement/i;

test('the site opens in German by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/de$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByText(/Demo/i).first()).toBeVisible();
});

test('clicking a vehicle photo opens the full vehicle page with damage and visit information', async ({ page }) => {
  await page.goto('/de/fahrzeuge');
  const card = page.locator('article').first();
  const name = (await card.locator('h3 a').innerText()).split('\n')[0];
  // Click on the photo area of the card.
  await card.click({ position: { x: 40, y: 40 } });
  await expect(page).toHaveURL(/\/de\/fahrzeuge\/[a-z0-9-]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name.split(' ')[0]);
  await expect(page.locator('#damages-title')).toBeVisible();
  await expect(page.getByRole('link', { name: /besichtigung/i }).first()).toBeVisible();
});

test('switching language keeps the same vehicle', async ({ page }) => {
  await page.goto('/de/fahrzeuge/vw-golf-vii-1-4-tsi-highline-2017');
  await switchLanguage(page, 'English', /menü öffnen/i);
  await expect(page).toHaveURL(/\/en\/vehicles\/vw-golf-vii-1-4-tsi-highline-2017$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await switchLanguage(page, 'Français', /open menu/i);
  await expect(page).toHaveURL(/\/fr\/vehicules\/vw-golf-vii-1-4-tsi-highline-2017$/);
});

test('filters are reflected in the URL and can be shared', async ({ page }) => {
  await page.goto('/de/fahrzeuge?fuel=diesel');
  const cards = page.locator('article');
  await expect(cards.first()).toBeVisible();
  for (const text of await cards.allInnerTexts()) expect(text).toContain('Diesel');

  await page.goto('/de/fahrzeuge');
  await page.locator('select[name="sort"]').selectOption('price_asc');
  await expect(page).toHaveURL(/sort=price_asc/);
});

test('there is no cart, payment, auction or financing on public pages', async ({ page }) => {
  for (const path of ['/de', '/de/fahrzeuge', '/de/fahrzeuge/bmw-x5-xdrive30d-2017', '/en/vehicles', '/fr/vehicules']) {
    await page.goto(path);
    expect(await page.locator('main').innerText()).not.toMatch(FORBIDDEN);
  }
});

test('drafts and unknown vehicles return 404', async ({ page }) => {
  expect((await page.goto('/de/fahrzeuge/opel-corsa-e-entwurf'))?.status()).toBe(404);
  expect((await page.goto('/en/vehicles/does-not-exist'))?.status()).toBe(404);
});

test('the admin area requires sign-in', async ({ page }) => {
  await page.goto('/admin/vehicles');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
