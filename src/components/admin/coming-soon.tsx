export function ComingSoon({ title, module }: { title: string; module: number }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-base font-medium text-slate-900">Coming soon</p>
        <p className="mt-1 text-sm text-slate-500">
          {title} will be implemented in Module {module}.
        </p>
      </section>
    </div>
  );
}
