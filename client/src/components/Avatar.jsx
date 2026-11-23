import { colorFor } from '../lib/colors';

export default function Avatar({ user, size = 24 }) {
  const initial = (user?.name || '?').trim()[0]?.toUpperCase();
  return user?.avatar ? (
    <img src={user.avatar} alt={user.name} title={user.name} width={size} height={size} className="rounded-full bg-white" style={{ width: size, height: size }} />
  ) : (
    <span title={user?.name} className="grid place-items-center rounded-full text-xs font-semibold text-white" style={{ width: size, height: size, background: colorFor(user?.id) }}>
      {initial}
    </span>
  );
}
