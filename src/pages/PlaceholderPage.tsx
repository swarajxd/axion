import { Sidebar } from '../components/layout/Sidebar';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-headline font-extrabold text-on-surface mb-4">{title}</h1>
          <p className="text-on-surface-variant">This page is currently under construction in the Digital Atelier.</p>
        </div>
      </main>
    </div>
  );
}
