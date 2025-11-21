"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
    dob: "",
    acceptPrivacy: false,
    isAdult: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function getPasswordStrength(password: string) {
    if (!password) return { label: "", className: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: "Weak", className: "text-red-600" };
    if (score === 3 || score === 4)
      return { label: "Medium", className: "text-yellow-600" };
    return { label: "Strong", className: "text-green-600" };
  }

  function hasSequentialChars(str: string, length = 3) {
    const s = str.toLowerCase();
    for (let i = 0; i <= s.length - length; i++) {
      let seq = true;
      for (let j = 1; j < length; j++) {
        if (s.charCodeAt(i + j) !== s.charCodeAt(i + j - 1) + 1) {
          seq = false;
          break;
        }
      }
      if (seq) return true;
    }
    return false;
  }

  function isAtLeast18(dobStr: string) {
    if (!dobStr) return false;
    const dob = new Date(dobStr);
    if (Number.isNaN(dob.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 18;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 🔹 NEW: trim + length validate username 3–15
    const trimmedUsername = form.username.trim();
    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    if (trimmedUsername.length > 15) {
      setError("Username must be at most 15 characters long.");
      return;
    }

    if (!trimmedUsername || !form.email || !form.password || !form.dob) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.email !== form.confirmEmail) {
      setError("Email and Confirm Email must match.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password and Confirm Password must match.");
      return;
    }

    if (!isAtLeast18(form.dob)) {
      setError("You must be at least 18 years old to register.");
      return;
    }

    if (!form.isAdult) {
      setError("You must certify that you are at least 18 years old.");
      return;
    }

    const pwd = form.password;
    if (pwd.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }
    if (!/\d/.test(pwd)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (hasSequentialChars(pwd)) {
      setError("Password must not contain easy sequences like abc or 123.");
      return;
    }

    const lowerPwd = pwd.toLowerCase();
    const lowerUsername = trimmedUsername.toLowerCase();
    const emailLocal = (form.email.split("@")[0] || "").toLowerCase();

    if (lowerUsername && lowerPwd.includes(lowerUsername)) {
      setError("Password must not contain your username.");
      return;
    }
    if (emailLocal && lowerPwd.includes(emailLocal)) {
      setError("Password must not contain your email.");
      return;
    }

    if (!form.acceptPrivacy) {
      setError("You must accept the privacy policy to create an account.");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          email: form.email,
          password: form.password,
          dob: form.dob,
          acceptPrivacy: form.acceptPrivacy,
          isAdult: form.isAdult,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || "Something went wrong while creating your account."
        );
        return;
      }

      router.push("/login");
    } catch (err) {
      console.error(err);
      setError("Unable to register right now. Please try again.");
    }
  }

  const strength = getPasswordStrength(form.password);

  return (
    <form className="flex flex-col space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-800">Username</label>
          <input
            name="username"
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={15}
            className="p-3 rounded border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-800">
            Date of Birth
          </label>
          <input
            name="dob"
            type="date"
            value={form.dob}
            onChange={handleChange}
            required
            className="p-3 rounded border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-800">Email</label>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="p-3 rounded border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-800">
            Confirm Email
          </label>
          <input
            name="confirmEmail"
            type="email"
            placeholder="Confirm Email"
            value={form.confirmEmail}
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
          {strength.label && (
            <p className={`text-xs font-medium ${strength.className}`}>
              Password strength: {strength.label}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-800">
            Confirm Password
          </label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full p-3 rounded border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none pr-20"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-600 hover:text-gray-900"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-700 md:col-span-2">
          <label className="flex items-start gap-2">
            <input
              name="acceptPrivacy"
              type="checkbox"
              checked={form.acceptPrivacy}
              onChange={handleChange}
              className="mt-1"
            />
            <span>
              I have read and agree to the{" "}
              <a href="/privacy" className="text-cyan-600 hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <label className="flex items-start gap-2">
            <input
              name="isAdult"
              type="checkbox"
              checked={form.isAdult}
              onChange={handleChange}
              className="mt-1"
            />
            <span>I certify that I am at least 18 years old.</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded transition shadow-md"
      >
        Create Account
      </button>
    </form>
  );
}