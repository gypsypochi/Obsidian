// frontend/src/components/PageHeader.jsx
export default function PageHeader({ title, subtitle, right }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {right && <div className="page-actions">{right}</div>}
    </header>
  );
}
