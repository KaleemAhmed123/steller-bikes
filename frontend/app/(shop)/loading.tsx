// Shown during shop route transitions (e.g. applying a filter). A skeleton grid
// reads as "loading" without a jarring blank.
export default function ShopLoading() {
  return (
    <div className="container" style={{ paddingTop: 36, paddingBottom: 60 }}>
      <div className="skeleton skeleton-line" style={{ width: 220, height: 20, marginBottom: 28 }} />
      <div className="rc-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton sk-photo" />
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" style={{ width: '70%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
