import './Skeleton.css';

export default function Skeleton({ width = '100%', height = 12, radius = 4, style }) {
  return <span className="sk" style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}
