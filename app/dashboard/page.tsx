import { redirect } from 'next/navigation';

// Server component that redirects
export default function Dashboard() {
  redirect('/dashboard/classic');
}