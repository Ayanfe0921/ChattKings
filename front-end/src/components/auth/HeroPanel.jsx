import { APP_NAME } from "../AppLogo";
import { HeroPattern } from "./HeroPattern";

const heroPanelClassName = [
    "relative flex min-h-[min(320px,42vh)] shrink-0 flex-col overflow-hidden",
    "bg-[#E8E8ED] dark:bg-black",
    "md:w-[44%] md:max-w-xl md:border-r md:border-black/10 dark:md:border-white/10",
    "lg:w-[42%] lg:max-w-none",
].join(" ");

const heroImageClassName = [
    "h-auto max-h-[min(44vh,380px)] w-full",
    "object-contain object-center select-none motion-reduce:animate-none",
    "md:max-h-[min(52vh,440px)]",
].join(" ");

export function HeroPanel() {
    return (
        <section className={heroPanelClassName}>
            <HeroPattern />

            <div className="relative z-1 flex flex-1 flex-col px-6 pb-6 pt-8 md:px-8 md:pb-8 md:pt-10">
                <div className="text-center md:text-left">
                    <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-[#636366]">
                        Secure gateway
                    </p>
                    <h2 className="text-balance font-mono text-[1.15rem] font-semibold uppercase leading-snug tracking-[0.06em] text-zinc-900 dark:text-white sm:text-[1.25rem]">
                        Open {APP_NAME}
                    </h2>
                    <p className="mx-auto mt-2.5 max-w-88 text-pretty font-mono text-[11px] font-medium leading-relaxed tracking-wide text-zinc-600 dark:text-[#98989D] md:mx-0 md:max-w-none">
                        Chats, photos, and reactions stay in sync—sign in on the right to continue.
                    </p>
                </div>

                <div className="flex flex-1 items-center justify-center py-6 md:py-4">
                    <div className="relative w-[min(92%,19rem)] sm:w-[min(88%,21rem)] md:w-[min(90%,22rem)] motion-safe:animate-[auth-float-y_4.5s_ease-in-out_infinite] motion-reduce:animate-none">
                        <img
                            src="/auth.png"
                            alt=""
                            width={1024}
                            height={1536}
                            className={heroImageClassName}
                            draggable={false}
                            decoding="async"
                        />
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 200 240"
                            preserveAspectRatio="none"
                            className="pointer-events-none absolute left-[26%] top-[85.5%] z-1 h-[14%] w-[42%] overflow-visible mix-blend-screen"
                        >
                            <defs>
                                <linearGradient id="rocket-flame" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor="#fffbd1" />
                                    <stop offset="0.22" stopColor="#ffe45c" />
                                    <stop offset="0.58" stopColor="#ff8a18" />
                                    <stop offset="1" stopColor="#ff3b18" stopOpacity="0.08" />
                                </linearGradient>
                                <radialGradient id="rocket-flame-glow">
                                    <stop stopColor="#fff5a1" stopOpacity="0.9" />
                                    <stop offset="0.4" stopColor="#ff7a1a" stopOpacity="0.65" />
                                    <stop offset="1" stopColor="#ff3b18" stopOpacity="0" />
                                </radialGradient>
                                <filter id="rocket-flame-blur" x="-100%" y="-40%" width="300%" height="200%">
                                    <feGaussianBlur stdDeviation="9" />
                                </filter>
                            </defs>
                            <ellipse
                                cx="100"
                                cy="105"
                                rx="56"
                                ry="100"
                                fill="url(#rocket-flame-glow)"
                                filter="url(#rocket-flame-blur)"
                                className="origin-top animate-[auth-flame-glow_180ms_ease-in-out_infinite_alternate] motion-reduce:animate-none"
                            />
                            <path
                                d="M100 0 C94 25 72 43 68 78 C63 119 87 153 96 194 C105 151 137 119 132 78 C128 43 106 25 100 0Z"
                                fill="url(#rocket-flame)"
                                className="origin-top animate-[auth-flame_220ms_ease-in-out_infinite_alternate] motion-reduce:animate-none"
                            />
                            <path
                                d="M100 0 C95 21 85 38 87 64 C89 88 98 111 101 133 C105 108 116 86 115 64 C114 39 105 20 100 0Z"
                                fill="#fff8c9"
                                opacity="0.94"
                                className="origin-top animate-[auth-flame-core_150ms_ease-in-out_infinite_alternate] motion-reduce:animate-none"
                            />
                        </svg>
                    </div>
                </div>

                <p className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-[#636366] md:text-left">
                    End-to-end session · Encrypted in transit
                </p>
            </div>
        </section>
    );
}
