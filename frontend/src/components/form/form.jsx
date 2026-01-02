// frontend/src/components/form/form.jsx
import "./form.css";

export function FormSection({ title, description, onSubmit, children }) {
  return (
    <section className="form-section">
      <header className="form-section-header">
        <h2 className="form-section-title">{title}</h2>
        {description && (
          <p className="form-section-description">{description}</p>
        )}
      </header>

      <form onSubmit={onSubmit} className="form-section-body">
        {children}
      </form>
    </section>
  );
}
