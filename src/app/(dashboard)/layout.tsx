export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <div className="relative z-10 flex flex-col flex-1">{children}</div>
    </div>
  );
}
