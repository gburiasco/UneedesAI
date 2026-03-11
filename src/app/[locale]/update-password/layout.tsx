import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Update Password',
  robots: {
    index: false,
    follow: false,
    noarchive: true
  }
};

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}