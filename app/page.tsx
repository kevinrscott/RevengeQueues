export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold">Revenge Queues</h1>

        <div className="flex gap-6 justify-center">
          <a
            href="/login"
            className="border border-white px-6 py-2 rounded text-lg hover:bg-white hover:text-black transition"
          >
            Sign In
          </a>

          <a
            href="/register"
            className="bg-white text-black px-6 py-2 rounded text-lg hover:opacity-70 transition"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
