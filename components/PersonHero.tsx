// Home-screen hero: large photo fading into a dark gradient with an
// info card overlapping the bottom edge. Used on every role's dashboard —
// student, teacher, class teacher, exam head, account, institute head.
import Image from 'next/image';

interface HeroField { label: string; value: string; }

export function PersonHero({
  photoUrl, name, subtitle, fields,
}: { photoUrl: string | null; name: string; subtitle: string; fields: HeroField[] }) {
  return (
    <div className="mb-16">
      <div className="hero-fade h-64 md:h-80 relative">
        {photoUrl ? (
          <Image src={photoUrl} alt={name} fill sizes="100vw" priority />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo to-ink flex items-center justify-center text-white text-5xl font-bn">
            {name[0]}
          </div>
        )}
      </div>

      {/* overlapping info card */}
      <div className="card -mt-14 relative z-10 mx-4 md:mx-8 p-5 md:p-6 shadow-[0_20px_50px_-15px_rgba(16,23,42,0.25)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink">{name}</h1>
            <div className="text-sm text-slate2-light mt-1">{subtitle}</div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {fields.map((f) => (
              <div key={f.label}>
                <div className="text-[10.5px] uppercase tracking-wide text-slate2-light font-semibold">{f.label}</div>
                <div className="text-base font-semibold text-ink mt-0.5">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
