export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="bb-skeleton h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bb-skeleton h-28 w-full rounded-2xl" />
        <div className="bb-skeleton h-28 w-full rounded-2xl" />
        <div className="bb-skeleton h-28 w-full rounded-2xl" />
        <div className="bb-skeleton h-28 w-full rounded-2xl" />
      </div>
      <div className="bb-skeleton h-72 w-full rounded-2xl" />
    </div>
  );
}
