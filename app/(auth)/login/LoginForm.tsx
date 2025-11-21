"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.identifier || !form.password) {
      setError("Please enter your credentials.");
      return;
    }

    const res = await signIn("credentials", {
      redirect: false,
      identifier: form.identifier,
      password: form.password,
    });

    if (res?.error) {
      setError("Invalid username/email or password.");
      return;
    }

    router.push("/profile");
  }

  return (
    <form className="flex flex-col space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-800">
          Username or Email
        </label>
        <input
          name="identifier"
          type="text"
          placeholder="Username or Email"
          value={form.identifier}
          onChange={handleChange}
          required
          className="p-3 rounded border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-800">Password</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full p-3 rounded border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none pr-20"
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-600 hover:text-gray-900"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded transition shadow-md"
      >
        Login
      </button>
    </form>
  );
}
