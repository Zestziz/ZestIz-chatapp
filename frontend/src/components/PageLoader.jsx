import { APP_NAME, AppLogo } from "./AppLogo";

const PageLoader = () => {
  return (
    <div className="flex h-dvh items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-5">
        {/* Logo */}
        <div className="relative">
          {/* Glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#7B3FF2] via-[#4A6BFF] to-[#00D4FF] opacity-30 blur-xl animate-pulse" />

          {/* Logo */}
          <div className="relative flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-background/80 shadow-2xl backdrop-blur-sm">
            <AppLogo size={38} className="rounded-xl" />
          </div>
        </div>

        {/* Loader */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative size-6">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />

            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7B3FF2] border-r-[#4A6BFF] animate-spin" />

            <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-[#7B3FF2] via-[#4A6BFF] to-[#00D4FF] opacity-80 blur-[2px]" />
          </div>

          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="bg-gradient-to-r from-[#7B3FF2] via-[#4A6BFF] to-[#00D4FF] bg-clip-text text-transparent">
              Loading {APP_NAME}
            </span>

            <span className="flex gap-0.5">
              <span className="animate-bounce [animation-delay:-0.3s]">.</span>
              <span className="animate-bounce [animation-delay:-0.15s]">.</span>
              <span className="animate-bounce">.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;