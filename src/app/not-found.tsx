import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex-1 w-full flex flex-col items-center justify-center text-center px-6 min-h-[80vh]">
      <h1 className="font-mono text-[var(--green)] text-7xl sm:text-8xl md:text-9xl font-bold mb-4">
        404
      </h1>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[var(--lightest-slate)] mb-8">
        Page Not Found
      </h2>
      <Link href="/" className="btn-big">
        Go Home
      </Link>
    </main>
  );
}
