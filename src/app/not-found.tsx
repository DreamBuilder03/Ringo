import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="font-serif text-6xl text-ringo-teal mb-4">404</h1>
      <p className="text-lg text-ringo-muted mb-8">Page not found</p>
      <Link
        href="/"
        className="rounded-lg bg-ringo-teal px-6 py-3 text-sm font-medium text-white hover:bg-ringo-teal-light transition-colors"
      >
        Back to Home
      </Link>
    </main>
  );
}
