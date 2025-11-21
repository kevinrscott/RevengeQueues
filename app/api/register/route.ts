import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

const RegisterSchema = z.object({
  username: z.string().min(3).max(15),
  email: z.string().email(),
  password: z.string().min(8),
  dob: z.string(),
  acceptPrivacy: z.boolean(),
  isAdult: z.boolean(),
});

function isAtLeast18(dobStr: string) {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1) Basic shape & types via Zod
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid form data.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { password, dob, acceptPrivacy, isAdult } = parsed.data;

    const normalizedUsername = parsed.data.username.trim().toLowerCase();
    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    // 2) Business rules (mirror what you do client-side)

    if (!acceptPrivacy) {
      return NextResponse.json(
        { error: "You must accept the privacy policy to create an account." },
        { status: 400 }
      );
    }

    if (!isAdult || !isAtLeast18(dob)) {
      return NextResponse.json(
        { error: "You must be at least 18 years old to register." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter." },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one lowercase letter." },
        { status: 400 }
      );
    }
    if (!/\d/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number." },
        { status: 400 }
      );
    }
    if (hasSequentialChars(password)) {
      return NextResponse.json(
        { error: "Password must not contain easy sequences like abc or 123." },
        { status: 400 }
      );
    }

    const lowerPwd = password.toLowerCase();
    const lowerUsername = normalizedUsername;
    const emailLocal = (normalizedEmail.split("@")[0] || "").toLowerCase();

    if (lowerPwd.includes(lowerUsername)) {
      return NextResponse.json(
        { error: "Password must not contain your username." },
        { status: 400 }
      );
    }
    if (emailLocal && lowerPwd.includes(emailLocal)) {
      return NextResponse.json(
        { error: "Password must not contain your email." },
        { status: 400 }
      );
    }

    // 3) Check username/email uniqueness
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { username: normalizedUsername },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username or email is already in use." },
        { status: 409 }
      );
    }

    // 4) Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 5) Create user in DB
    await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        dob: new Date(dob),
      },
    });

    // 6) All good
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error while creating account." },
      { status: 500 }
    );
  }
}