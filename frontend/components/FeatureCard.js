import ProductBadge from "./ProductBadge";

export default function FeatureCard({ icon, tone, title, text, status }) {
  return (
    <article className="card card--feature card--hover">
      <div className={`card__icon card__icon--${tone}`} aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {status && <ProductBadge status={status} />}
    </article>
  );
}