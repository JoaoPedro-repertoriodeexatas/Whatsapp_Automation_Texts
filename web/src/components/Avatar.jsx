import { getInitials } from '../utils/formatters.js';

const AVATAR_TONES = [
  'bg-[#E5EAF2] text-[#0F2C59] dark:bg-[#23344F] dark:text-[#BFD4F5]',
  'bg-[#E8ECEF] text-[#334155] dark:bg-[#313842] dark:text-[#CBD5E1]',
  'bg-[#ECEBE6] text-[#4A463B] dark:bg-[#3B3832] dark:text-[#DDD8CE]',
  'bg-[#E4ECE9] text-[#224B3E] dark:bg-[#233932] dark:text-[#B8D8CD]',
  'bg-[#ECE8F0] text-[#453559] dark:bg-[#362E42] dark:text-[#D5C9E6]',
];

function getToneIndex(seed) {
  const str = String(seed || '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % AVATAR_TONES.length;
}

export function Avatar({ name, phone, size = 'md', inverted = false }) {
  const initials = getInitials(name, phone);
  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 text-[12px]'
      : size === 'lg'
        ? 'h-10 w-10 text-[13px]'
        : 'h-10 w-10 text-[13px]';

  const toneClass = inverted
    ? 'bg-white/20 text-white ring-1 ring-white/20'
    : AVATAR_TONES[getToneIndex(phone || name)];

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight transition-colors duration-200 ${sizeClass} ${toneClass}`}
    >
      {initials}
    </div>
  );
}
