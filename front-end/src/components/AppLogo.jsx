export const APP_NAME = "ChattKings";

export function AppLogo({ className = "", size = 32, alt = APP_NAME }) {
  return (
    <img
      src="/hero.png"
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 object-contain select-none ${className}`}
      draggable={false}
    />
  );
}