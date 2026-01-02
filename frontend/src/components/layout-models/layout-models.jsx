// frontend/src/components/layout-models/layout-models.jsx
import "./layout-models.css";

export default function LayoutModels({ title, description, children, toolbar }) {
  return (
    <div className="models-layout">
      <header className="models-layout-header">
        <div>
          <h1 className="models-layout-title">{title}</h1>
          {description && (
            <p className="models-layout-description">{description}</p>
          )}
        </div>

        {toolbar && <div className="models-layout-toolbar">{toolbar}</div>}
      </header>

      <main className="models-layout-main">{children}</main>
    </div>
  );
}
