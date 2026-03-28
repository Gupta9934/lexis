import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LEXIS — Intelligent Research Assistant',
  description: 'Upload PDFs, ask questions, get answers with source citations. Powered by Gemini + Pinecone RAG.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}