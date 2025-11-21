import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-xl space-y-8 text-black">
        <h1 className="text-4xl font-bold text-center text-gray-900">
          Sign In
        </h1>
        <p className="text-center text-gray-600 text-sm">
          Login to manage/join teams, scrims, and tournaments.
        </p>

        <LoginForm />

        <p className="text-center text-gray-600 text-sm">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-cyan-600 font-semibold hover:underline">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}
