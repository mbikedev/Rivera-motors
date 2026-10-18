export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="space-y-3 border-b pb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      {intro ? <p className="text-muted-foreground max-w-3xl text-lg">{intro}</p> : null}
    </header>
  );
}
