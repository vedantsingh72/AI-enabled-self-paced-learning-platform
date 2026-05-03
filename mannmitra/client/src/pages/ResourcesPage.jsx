const resources = [
  {
    title: "5-min Breathing Exercise",
    link: "https://www.youtube.com/watch?v=SEfs5TJZ6Nk",
  },
  {
    title: "Guided Meditation",
    link: "https://www.youtube.com/watch?v=inpok4MKVLM",
  },
  {
    title: "Progressive Relaxation",
    link: "https://www.youtube.com/watch?v=86HUcX8ZtAk",
  },
];
export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
        Resources
      </p>
      <h2 className="mt-2 mm-heading md:text-3xl">Wellness hub</h2>
      <div className="mt-4 space-y-3">
        {resources.map((r) => (
          <a
            key={r.title}
            href={r.link}
            target="_blank"
            rel="noreferrer"
            className="mm-card block text-slate-800 transition hover:border-wellness-sage/35 hover:shadow-md"
          >
            {r.title}
          </a>
        ))}
      </div>
    </div>
  );
}
