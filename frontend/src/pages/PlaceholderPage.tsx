type PlaceholderPageProps = { title: string };

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main>
      <h1>{title}</h1>
    </main>
  );
}
