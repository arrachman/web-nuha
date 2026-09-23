/** Kerangka halaman hasil pindai QR — ringan & ramah HP, tanpa shell staf. */
export function PindaiShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '26px 16px 60px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8973A', marginBottom: 6 }}>Sarpras · Nurul Huda Mergosono</div>
      {children}
    </div>
  );
}
