import type { ReactNode } from "react";

const drawings = {
  plus: <path d="M12 5v14M5 12h14" />,
  grip: <path d="M5 9h14M5 14h14" />,
  resize: <path d="m8 18 10-10m-4 10 4-4" />,
  trash: <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v6m4-6v6" />,
  check: <path d="m5 12 4 4 10-10" />,
  cloud: (
    <>
      <path d="M7 17a4.5 4.5 0 0 1-1-8.9 6 6 0 0 1 11.4-1.4A5.2 5.2 0 0 1 19 16.8" />
      <path d="m8.5 14.5 2.5 2.5 4.5-5" />
    </>
  ),
  alert: <path d="M12 3 2.5 20h19L12 3ZM12 9v4m0 3v.1" />,
  loading: <path d="M20 12a8 8 0 1 1-8-8" />,
  palette: (
    <>
      <path d="M20.7 12.5c-.3 1.8-1.4 2.6-3.1 2.4l-1.7-.3c-1-.1-1.8.8-1.4 1.8l.3.8c.6 1.6-.4 3-2.1 3.1a8.6 8.6 0 1 1 8-7.8Z" />
      <path d="M7.2 10.5h.1m3-3.2h.1m4.6.7h.1" strokeWidth="2.7" />
    </>
  ),
  cursor: <path d="m5 3 13.8 9.2-6.5 1.3-2.3 6.1L5 3Z" />,
} satisfies Record<string, ReactNode>;

type IconProps = {
  name: keyof typeof drawings | "brand";
  size?: number;
};

export function Icon({ name, size = 18 }: IconProps) {
  if (name === "brand") {
    return (
      <svg
        aria-hidden="true"
        className="brand-icon"
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
      >
        <rect width="40" height="40" rx="11" fill="currentColor" />
        <path d="m8 12 17-3 4 19-17 3z" fill="#A4B18A" />
        <path d="m13 11 18 1-1 14-5 4-13-1z" fill="#F4F0C3" />
        <path d="m25 30 .3-4.5 4.7.5z" fill="#B5B482" />
        <path
          d="m17 17 9 .5m-9.3 3 6 .3"
          stroke="#536343"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {drawings[name]}
    </svg>
  );
}
