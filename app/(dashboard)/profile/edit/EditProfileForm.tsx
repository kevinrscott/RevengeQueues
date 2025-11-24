"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type RankOption = {
  id: number;
  name: string;
};

type Props = {
  initialUsername: string;
  initialRegion: string;
  initialProfilePhoto: string;
  initialIngameName: string;
  initialRankId: number | null;
  profileId: number | null;
  ranks: RankOption[];
};

export default function EditProfileForm({
  initialUsername,
  initialRegion,
  initialProfilePhoto,
  initialIngameName,
  initialRankId,
  profileId,
  ranks,
}: Props) {
  const router = useRouter();

  const username = initialUsername;
  const [region, setRegion] = useState(initialRegion);
  const [profilePhoto, setProfilePhoto] = useState(initialProfilePhoto);
  const [ingameName, setIngameName] = useState(initialIngameName);
  const [rankId, setRankId] = useState<string>(
    initialRankId ? String(initialRankId) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let profilePhotoUrl = initialProfilePhoto;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("kind", "user");

        const uploadRes = await fetch("/api/image-upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          setError(uploadData.error || "Failed to upload avatar.");
          setSaving(false);
          return;
        }

        profilePhotoUrl = uploadData.url;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: region || null,
          profilePhoto: profilePhotoUrl,
          ingameName,
          rankId: rankId ? Number(rankId) : null,
          profileId,
        }),
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

  const avatarLetter = username[0]?.toUpperCase() ?? "?";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="h-24 w-24 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center text-xl font-semibold hover:ring-2 hover:ring-cyan-500 transition"
        >
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={`${username} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{avatarLetter}</span>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <p className="text-xs text-slate-400">
          Click the avatar to upload a new profile picture.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">Username</label>
        <input
          type="text"
          value={username}
          disabled
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
        />
        <p className="text-xs text-slate-500">Usernames cannot be changed.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">Region</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        >
          <option value="">Select Region</option>
          <option value="NA">NA</option>
          <option value="EU">EU</option>
          <option value="SA">SA</option>
          <option value="AS">AS</option>
          <option value="OC">OC</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">
          In-game Name
        </label>
        <input
          type="text"
          value={ingameName}
          onChange={(e) => setIngameName(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">Rank</label>
        <select
          value={rankId}
          onChange={(e) => setRankId(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          disabled={!profileId}
        >
          <option value="">Unranked</option>
          {ranks.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push(`/profile/${username}`)}
          className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}