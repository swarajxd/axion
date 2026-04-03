import { MainLayout } from '../components/layout/MainLayout';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <MainLayout>
      <div className="p-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-headline font-extrabold text-on-surface mb-4">{title}</h1>
          <p className="text-on-surface-variant">This page is currently under construction in the Digital Atelier.</p>
        </div>
      </div>
    </MainLayout>
  );
}
