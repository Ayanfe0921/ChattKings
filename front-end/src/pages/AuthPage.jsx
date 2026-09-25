import { ActionPanel } from "../components/auth/ActionPanel";
import Header from "../components/auth/Header";
import { HeroPanel } from "../components/auth/HeroPanel";
import { useWallpaper } from "../context/wallpaper";

function AuthPage() {
  const { frameStyle } = useWallpaper();

  return (
    <div className="box-border flex min-h-dvh flex-col p-3 sm:p-5 md:p-8" style={frameStyle}>
      <div className="mx-auto flex w-full max-w-368 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-background text-foreground">
        <Header />

        <main className="relative flex flex-1 flex-col overflow-hidden md:flex-row">
          <HeroPanel />
          <ActionPanel />
        </main>
      </div>
    </div>
  );
}
export default AuthPage;