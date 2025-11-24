import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-xl space-y-8 text-black">
        <h1 className="text-4xl font-bold text-center text-gray-900">
          Create Your Account
        </h1>
        <p className="text-center text-gray-600 text-sm">
          Join Revenge Queues and start creating/joining teams, scrims, and more.
        </p>

        <RegisterForm />

        <p className="text-center text-gray-600 text-sm">
          Already registered?{" "}
          <a href="/login" className="text-cyan-600 font-semibold hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
