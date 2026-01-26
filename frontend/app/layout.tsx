import "./globals.css";

export const metadata = {
  title: "AgentCoach AI",
  description: "AI Coaching for Real Estate Conversations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {/* Mobile-first container */}
        <div className="mx-auto max-w-md">
          {children}
        </div>
      </body>
    </html>
  );
}
