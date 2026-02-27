type UserAvatarProps = {
  src: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
};

function getAvatarText(name?: string | null): string {
  const value = name?.trim();

  if (!value) {
    return "TA";
  }

  return value.slice(0, 1).toUpperCase();
}

export function UserAvatar({
  src,
  name,
  className = "size-10",
  textClassName = "text-sm",
}: UserAvatarProps) {
  const avatarText = getAvatarText(name);

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-orange-100 via-pink-100 to-orange-200 font-bold text-slate-700 ${className} ${textClassName}`}
      style={
        src
          ? {
              backgroundImage: `url(${src})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }
          : undefined
      }
      aria-label="用户头像"
    >
      {src ? null : avatarText}
    </span>
  );
}
