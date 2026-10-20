"use client";

import Image from "next/image";
import DashboardHeader from "@/components/dashboard/layout/dashboard-header";

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-white text-[#141414]">
      <DashboardHeader />

      <main className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-xl flex-col items-center overflow-hidden px-7 pb-12 pt-14 sm:px-10 sm:pt-20">
        <Image
          src="/logo.png"
          alt="Fleex"
          width={78}
          height={78}
          priority
          className="h-[78px] w-[78px] object-contain"
        />

        <div className="relative mt-12 h-[270px] w-full max-w-[350px] sm:mt-16 sm:h-[320px] sm:max-w-[390px]">
          <Image
            src="/collage-01.jpg"
            alt=""
            width={260}
            height={260}
            priority
            className="absolute left-[5%] top-[56px] z-20 h-[190px] w-[230px] rotate-[-8deg] rounded-[22px] border-[5px] border-white object-cover shadow-[0_16px_32px_rgba(0,0,0,0.14)] sm:h-[220px] sm:w-[265px]"
          />
          <Image
            src="/collage-02.jpg"
            alt=""
            width={240}
            height={240}
            priority
            className="absolute right-[2%] top-0 z-10 h-[170px] w-[205px] rotate-[7deg] rounded-[22px] border-[5px] border-white object-cover shadow-[0_16px_32px_rgba(0,0,0,0.12)] sm:h-[195px] sm:w-[235px]"
          />
          <Image
            src="/collage-03.jpg"
            alt=""
            width={240}
            height={160}
            priority
            className="absolute bottom-0 right-[10%] z-30 h-[112px] w-[215px] rotate-[-4deg] rounded-[20px] border-[5px] border-white object-cover shadow-[0_16px_30px_rgba(0,0,0,0.14)] sm:h-[135px] sm:w-[250px]"
          />
        </div>

        <h1 className="mt-12 text-center text-[42px] font-black leading-[0.95] tracking-[-0.07em] sm:mt-16 sm:text-6xl">
          Coming soon
        </h1>
      </main>
    </div>
  );
}
