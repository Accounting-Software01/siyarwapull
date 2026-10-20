"use client";

import {
  ArrowLeft,
  ChevronRight,
  Database,
  Eye,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

export default function PrivacyPage() {
  const router = useRouter();
  const [privateAccount, setPrivateAccount] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricLogin, setBiometricLogin] = useState(false);

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
          <h1 className="text-sm font-bold">Privacy & Security</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20 pt-7 sm:px-8">
        <section className="border border-[#dfe3dc] bg-[#14181c] p-5 text-white sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b7f23a]">
                Your security center
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.06em] sm:text-3xl">
                You are in control.
              </h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-white/55">
                Manage who can access your content, how your account is
                protected, and what information Fleex stores.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#b7f23a] text-[#14181c]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
            <span className="text-white/55">Security status</span>
            <span className="font-bold text-[#b7f23a]">Protected</span>
          </div>
        </section>

        <SettingsSection eyebrow="Privacy" title="Visibility and access">
          <SettingRow
            icon={Eye}
            label="Private account"
            description="Only approved followers can see your content"
            control={
              <Switch checked={privateAccount} onChange={setPrivateAccount} />
            }
          />
          <SettingRow
            icon={UserRound}
            label="Blocked accounts"
            description="Review people you have blocked"
            action={() => {}}
          />
        </SettingsSection>

        <SettingsSection eyebrow="Security" title="Protect your account">
          <SettingRow
            icon={KeyRound}
            label="Two-factor authentication"
            description="Add a second step when signing in"
            control={
              <Switch
                checked={twoFactorEnabled}
                onChange={setTwoFactorEnabled}
              />
            }
          />
          <SettingRow
            icon={Fingerprint}
            label="Biometric login"
            description="Use Face ID or fingerprint on this device"
            control={
              <Switch checked={biometricLogin} onChange={setBiometricLogin} />
            }
          />
          <SettingRow
            icon={LockKeyhole}
            label="Password and login"
            description="Change your password and review sign-in options"
            action={() => {}}
          />
          <SettingRow
            icon={Smartphone}
            label="Active sessions"
            description="See where your Fleex account is signed in"
            action={() => {}}
          />
        </SettingsSection>

        <SettingsSection eyebrow="Your data" title="Data and permissions">
          <SettingRow
            icon={Database}
            label="Download your data"
            description="Request a copy of your Fleex information"
            action={() => {}}
          />
          <SettingRow
            icon={ShieldCheck}
            label="Connected permissions"
            description="Review apps and services connected to Fleex"
            action={() => {}}
          />
        </SettingsSection>

        <section className="mt-8 border border-[#e8caca] bg-white">
          <div className="border-b border-[#f0dede] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b33b3b]">
              Danger zone
            </p>
            <h2 className="mt-1 text-base font-bold">
              Permanent account actions
            </h2>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-5">
            <div>
              <p className="text-sm font-bold text-[#8c2e2e]">Delete account</p>
              <p className="mt-1 text-xs leading-5 text-[#9e6b6b]">
                This permanently removes your account and content.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center gap-2 border border-[#d9a9a9] px-3 text-xs font-bold text-[#b33b3b]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </section>

        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#687074] hover:text-[#14181c]"
        >
          <LogOut className="h-4 w-4" />
          Sign out of all other sessions
        </button>
      </div>
    </main>
  );
}

function SettingsSection({
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

function SettingRow({
  icon: Icon,
  label,
  description,
  control,
  action,
}: {
  icon: typeof Eye;
  label: string;
  description: string;
  control?: ReactNode;
  action?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f6faec] text-[#779f00]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs leading-4 text-[#8a9092]">{description}</p>
        </div>
      </div>
      {control ?? (
        <button
          type="button"
          onClick={action}
          aria-label={`Open ${label}`}
          className="shrink-0 text-[#8a9092] hover:text-[#14181c]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
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
