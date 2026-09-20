export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-48 bg-line rounded mb-2" />
      <div className="h-4 w-72 bg-line rounded mb-6" />
      <div className="grid md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-20 bg-line rounded mb-3" />
            <div className="h-7 w-16 bg-line rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
