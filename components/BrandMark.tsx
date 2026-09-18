export function BrandMark({ dark = false, size = 'md' }: { dark?: boolean; size?: 'sm' | 'md' }) {
  const seal = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  return (
    <div className="flex items-center gap-2.5">
      {/* Original book + flame emblem — see public/logo.svg */}
      <img src="/logo.svg" alt="বিদ্যাঙ্গন" className={`${seal} flex-shrink-0`} />
      <div>
        <div className={`font-bn font-bold leading-none ${size === 'sm' ? 'text-sm' : 'text-base'} ${dark ? 'text-white' : 'text-ink'}`}>বিদ্যাঙ্গন</div>
        <div className={`text-[9px] tracking-[.14em] font-semibold mt-0.5 ${dark ? 'text-brass-light' : 'text-brass'}`}>BIDDYANGON</div>
      </div>
    </div>
  );
}
