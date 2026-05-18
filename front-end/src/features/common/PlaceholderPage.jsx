import Badge from '../../components/ui/Badge.jsx';

export default function PlaceholderPage({ title, phase }) {
  return (
    <div>
      <header style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 className="t-headline">{title}</h1>
        {phase && <Badge tone="primary" variant="outline">Lands in {phase}</Badge>}
      </header>
      <p className="t-body">This screen is part of the phased delivery. See <code className="mono">CHANGELOG.md</code> for status.</p>
    </div>
  );
}
