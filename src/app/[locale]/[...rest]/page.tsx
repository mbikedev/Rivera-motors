import { notFound } from 'next/navigation';

// Unknown localized paths render the localized not-found page.
export default function CatchAll() {
  notFound();
}
