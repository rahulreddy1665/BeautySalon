export function PlaceholderScreen({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="max-w-xl space-y-1">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </section>
  )
}
