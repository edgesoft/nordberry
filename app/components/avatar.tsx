type AvatarProps = {
    user: {
      name?: string | null;
      email?: string | null;
      imageUrl?: string | null;
      status?: string | null;
    };
    size?: number; // t.ex. 6 = w-6 h-6
  };
  
  export default function Avatar({ user, size = 6 }: AvatarProps) {
    const initials = (user.name || user.email || "?").charAt(0).toUpperCase();
    const sizeClass = `w-${size} h-${size}`;

    return user.imageUrl ? (
      <img
        src={user.imageUrl}
        alt={user.name ?? "avatar"}
        className={`${sizeClass} rounded-full object-cover border border-gray-700`}
      />
    ) : (
      <div
        className={`${sizeClass} rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-semibold border border-indigo-800`}
      >
        {initials}
      </div>
    );
  }