export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 w-full">
      <div className="size-10 rounded-full bg-zinc-800/50 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-zinc-800/50 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-zinc-800/50 animate-pulse" />
      </div>
    </div>
  );
}
