import { redirect } from 'next/navigation';

/** Marketplace store panel (alias for /business). */
export default function StorePage() {
  redirect('/business');
}
