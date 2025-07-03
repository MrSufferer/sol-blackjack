import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after 5 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#144b1e] flex items-center justify-center px-4">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl mb-4">Page Not Found</h2>
        <p className="text-lg mb-8">The page you're looking for doesn't exist.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2 px-4 rounded"
        >
          Go Home
        </button>
        <p className="text-sm mt-4 opacity-70">
          You'll be redirected automatically in 5 seconds...
        </p>
      </div>
    </div>
  );
} 