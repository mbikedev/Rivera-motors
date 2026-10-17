import { describe, expect, it } from 'vitest';
import de from '@/messages/de.json';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
  );
}

function values(tree: Tree): string[] {
  return Object.values(tree).flatMap((value) => (typeof value === 'string' ? [value] : values(value)));
}

describe('translations', () => {
  const deKeys = keys(de as Tree).sort();

  it.each([
    ['en', en],
    ['fr', fr],
  ])('%s has exactly the same keys as German', (_, messages) => {
    expect(keys(messages as Tree).sort()).toEqual(deKeys);
  });

  it.each([
    ['de', de],
    ['en', en],
    ['fr', fr],
  ])('%s has no empty strings', (_, messages) => {
    expect(values(messages as Tree).filter((v) => v.trim() === '')).toEqual([]);
  });

  it('never offers online buying, carts, auctions, financing or customer accounts', () => {
    // The catalogue informs and invites to an on-site visit only (no e-commerce wording).
    const forbidden =
      /\b(warenkorb|in den warenkorb|jetzt kaufen|kasse|checkout|add to cart|basket|buy now|panier|acheter maintenant|auktion|auction|enchère|enchères|finanzierung|financing|financement|create an account|créer un compte|konto erstellen)\b/i;
    for (const messages of [de, en, fr]) {
      const offending = values(messages as Tree).filter((v) => forbidden.test(v));
      expect(offending).toEqual([]);
    }
  });
});
