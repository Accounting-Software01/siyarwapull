"use client";

import {
  Bell,
  ChevronRight,
  Globe2,
  HelpCircle,
  KeyRound,
  LockKeyhole,
  LogOut,
  Moon,
  Palette,
  ShieldCheck,
  UserRound,
  WalletCards,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setEmail(user?.email || ""));
  }, [supabase]);

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#14181c]">
      <header className="sticky top-0 z-20 border-b border-[#dfe3dc] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#687074] hover:text-[#14181c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-sm font-bold">Settings</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20 pt-7 sm:px-8">
        <section className="border border-[#dfe3dc] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center bg-[#14181c] text-xl font-black text-[#b7f23a]">
              {email?.[0]?.toUpperCase() || "F"}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#779f00]">
                Your account
              </p>
              <h2 className="mt-1 truncate text-lg font-bold">
                {email || "Fleex member"}
              </h2>
              <p className="mt-1 text-xs text-[#8a9092]">
                Manage your Fleex experience
              </p>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="mt-5 flex h-10 items-center justify-center border border-[#dfe3dc] text-xs font-bold hover:border-[#14181c]"
          >
            Edit profile
          </Link>
        </section>

        <SettingsGroup eyebrow="Account" title="Identity and access">
          <SettingsLink
            icon={UserRound}
            label="Profile information"
            description="Name, username, bio, and avatar"
            href="/profile/edit"
          />
          <SettingsLink
            icon={KeyRound}
            label="Password and login"
            description="Change your password and sign-in options"
            href="/dashboard/privacy"
          />
          <SettingsLink
            icon={ShieldCheck}
            label="Privacy and security"
            description="Visibility, sessions, and account protection"
            href="/dashboard/privacy"
          />
        </SettingsGroup>

        <SettingsGroup eyebrow="Experience" title="Make Fleex yours">
          <SettingsLink
            icon={Palette}
            label="Appearance"
            description="Fleex light interface"
            href="/dashboard/settings/appearance"
          />
          <SettingsLink
            icon={Globe2}
            label="Language and region"
            description="English · West Africa"
            href="/dashboard/settings/language"
          />
          <SettingsRow
            icon={Moon}
            label="Reduce motion"
            description="Use fewer interface animations"
            control={<Switch checked={false} onChange={() => {}} />}
          />
        </SettingsGroup>

        <SettingsGroup eyebrow="Notifications" title="Stay informed">
          <SettingsRow
            icon={Bell}
            label="Push notifications"
            description="Likes, comments, follows, and updates"
            control={
              <Switch checked={notifications} onChange={setNotifications} />
            }
          />
          <SettingsLink
            icon={WalletCards}
            label="Earnings notifications"
            description="Payouts, eligibility, and creator updates"
            href="/dashboard/earnings"
          />
        </SettingsGroup>

        <SettingsGroup eyebrow="Privacy" title="Control your audience">
          <SettingsRow
            icon={LockKeyhole}
            label="Private account"
            description="Only approved followers can see your content"
            control={
              <Switch checked={privateAccount} onChange={setPrivateAccount} />
            }
          />
          <SettingsLink
            icon={ShieldCheck}
            label="Blocked accounts"
            description="Review people you have blocked"
            href="/dashboard/privacy"
          />
        </SettingsGroup>

        <section className="mt-8 border border-[#dfe3dc] bg-white">
          <div className="border-b border-[#e9ece6] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#779f00]">
              Help
            </p>
            <h2 className="mt-1 text-base font-bold">Need a hand?</h2>
          </div>
          <SettingsLink
            icon={HelpCircle}
            label="Help and support"
            description="Find answers or contact the Fleex team"
            href="/dashboard/support"
          />
        </section>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/auth/login");
          }}
          className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#b33b3b]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </main>
  );
}

function SettingsGroup({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 border border-[#dfe3dc] bg-white">
      <div className="border-b border-[#e9ece6] px-5 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#779f00]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-bold">{title}</h2>
      </div>
      <div className="divide-y divide-[#edf0eb]">{children}</div>
    </section>
  );
}

function SettingsLink({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: typeof UserRound;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fbfcf9]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f6faec] text-[#779f00]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 truncate text-xs text-[#8a9092]">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#8a9092]" />
    </Link>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  description,
  control,
}: {
  icon: typeof UserRound;
  label: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f6faec] text-[#779f00]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs text-[#8a9092]">{description}</p>
        </div>
      </div>
      {control}
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 transition-colors ${checked ? "bg-[#b7f23a]" : "bg-[#dfe3dc]"}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 bg-[#14181c] transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}
