"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type RankOption = {
  id: number;
  name: string;
};

type Props = {
  ranks: RankOption[];
};

const REGION_OPTIONS = ["NA", "EU", "SA", "AS", "OC"] as const;

export default function CreateTeamForm({ ranks }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [region, setRegion] = useState<string>("");
  const [bio, setBio] = useState("");
  const [rankId, setRankId] = useState<string>("");
  const [isRecruiting, setIsRecruiting] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleLogoClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || region === "") {
      setError("Please fill in team name and region.");
      return;
    }

    setSubmitting(true);

    try {
      let logoUrl: string | null = null;

      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("kind", "team");

        const uploadRes = await fetch("/api/image-upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          setError(uploadData.error || "Failed to upload logo.");
          setSubmitting(false);
          return;
        }

        logoUrl = uploadData.url;
      }

      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          region,
          isRecruiting,
          bio: bio.trim() || null,
          rankId: rankId ? Number(rankId) : null,
          logoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create team.");
        setSubmitting(false);
        return;
      }

      router.push(`/teams/${encodeURIComponent(data.team.slug)}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Unexpected error while creating team.");
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-6 rounded-lg border border-slate-700 bg-slate-900/60 p-5"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleLogoClick}
          className="h-24 w-24 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-cyan-500 transition"
        >
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Team logo preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-slate-300">
              Upload Logo
            </span>
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
          Click the logo to upload a team image (optional).
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">
          Team name*
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          placeholder="Enter Team Name..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">
          Region*
        </label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        >
          <option value="">Select Region</option>
          {REGION_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">
          Team rank
        </label>
        <select
          value={rankId}
          onChange={(e) => setRankId(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        >
          <option value="">Unranked</option>
          {ranks.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200">
          Team bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
          placeholder="Describe your team, playstyle, goals, etc."
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={isRecruiting}
            onChange={(e) => setIsRecruiting(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500"
          />
          Open for recruitment (Adds to LFG Page)
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create team"}
      </button>
    </form>
  );
}