import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'AI Facial Similarity Analyzer — Production AI Biometrics',
  description: 'Enterprise-grade AI facial similarity analysis featuring ArcFace embeddings and calibrated similarity percentage.',
  keywords: ['AI', 'Face Detection', 'Facial Similarity', 'ArcFace', 'YuNet', 'Biometrics'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#090514] text-white">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

