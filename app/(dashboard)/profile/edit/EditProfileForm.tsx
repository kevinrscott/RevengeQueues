"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialUsername: string;
  initialRegion: string;
  initialProfilePhoto: string;
};

export default function EditProfileForm({
  initialUsername,
  initialRegion,
  initialProfilePhoto,
}: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [region, setRegion] = useState(initialRegion);
  const [profilePhoto, setProfilePhoto] = useState(initialProfilePhoto);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, region, profilePhoto }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile.");
        setSaving(false);
        return;
      }

      router.push(`/profile/${username}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Unexpected error while saving.");
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded border border-slate-700 bg-stone-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">Region</label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="NA, EU, etc."
          className="w-full rounded border border-slate-700 bg-stone-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">
          Profile Photo URL
        </label>
        <input
          type="url"
          value={profilePhoto}
          onChange={(e) => setProfilePhoto(e.target.value)}
          placeholder="https://example.com/avatar.png"
          className="w-full rounded border border-slate-700 bg-stone-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-cyan-500 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
