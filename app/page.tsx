import { redirect } from 'next/navigation';
import { fetchFeatureFlags } from '@/lib/feature-flags';

export default async function Home() {
  // VELO-first: land on the verify hub unless the learning dashboard is enabled.
  const flags = await fetchFeatureFlags();
  redirect(flags.dashboard ? '/dashboard' : '/verify');
}
