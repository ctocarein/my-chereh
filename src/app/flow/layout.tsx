export default function FlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page page--flow">{children}</div>;
}
