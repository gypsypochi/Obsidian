// frontend/src/components/layout-crud/layout-crud.jsx
import "./layout-crud.css";

export default function LayoutCrud({ title, description, children }) {
  return (
    <div className="crud-page">
      <header className="crud-header">
        <div>
          <h1 className="crud-title">{title}</h1>
          {description && (
            <p className="crud-description">{description}</p>
          )}
        </div>
      </header>

      <div className="crud-content">{children}</div>
    </div>
  );
}
