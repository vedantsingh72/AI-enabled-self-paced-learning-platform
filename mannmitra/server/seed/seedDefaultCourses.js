import Course from "../models/Course.js";

/**
 * Cloudinary — same asset for every JEE unit (HTML5 video):
 * https://res.cloudinary.com/dg4zrl860/video/upload/Screen_Recording_2025-11-26_045800_pcxi9o.mp4
 */
const CLOUDINARY_CLOUD = "dg4zrl860";
const CLOUDINARY_PUBLIC_ID = "Screen_Recording_2025-11-26_045800_pcxi9o";
const SHARED_VIDEO_MP4 = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload/${CLOUDINARY_PUBLIC_ID}.mp4`;

const TRACK = "JEE";

/** @type {{ slug: string; subject: string; unitLabel: string; order: number }[]} */
const JEE_UNITS = [
  { slug: "jee-physics-units-and-dimensions", subject: "Physics", unitLabel: "Units and dimensions", order: 101 },
  { slug: "jee-physics-mechanics", subject: "Physics", unitLabel: "Mechanics", order: 102 },
  { slug: "jee-physics-electrodynamics", subject: "Physics", unitLabel: "Electrodynamics", order: 103 },
  { slug: "jee-physics-modern-physics", subject: "Physics", unitLabel: "Modern physics", order: 104 },
  { slug: "jee-chemistry-organic", subject: "Chemistry", unitLabel: "Organic", order: 201 },
  { slug: "jee-chemistry-inorganic", subject: "Chemistry", unitLabel: "Inorganic", order: 202 },
  { slug: "jee-chemistry-physical", subject: "Chemistry", unitLabel: "Physical", order: 203 },
  { slug: "jee-maths-algebra", subject: "Maths", unitLabel: "Algebra", order: 301 },
  { slug: "jee-maths-calculus", subject: "Maths", unitLabel: "Calculus", order: 302 },
  { slug: "jee-maths-trigonometry", subject: "Maths", unitLabel: "Trigonometry", order: 303 },
];

const LEGACY_DEMO_SLUG = "screen-recording-demo";

export async function seedDefaultCourses() {
  await Course.deleteOne({ slug: LEGACY_DEMO_SLUG });

  const sharedDescription =
    "JEE-oriented module. In this demo catalog every unit uses the same sample video; replace URLs per unit when you publish real lessons.";
  const sharedSummary =
    "Watch the lesson, pause and replay as needed. Adaptive pacing uses study signals only after you accept tracking.";

  for (const row of JEE_UNITS) {
    const title = `${TRACK} · ${row.subject} · ${row.unitLabel}`;
    await Course.findOneAndUpdate(
      { slug: row.slug },
      {
        $set: {
          title,
          track: TRACK,
          subject: row.subject,
          unitLabel: row.unitLabel,
          description: sharedDescription,
          summaryText: sharedSummary,
          videoUrl: SHARED_VIDEO_MP4,
          durationSeconds: 0,
          order: row.order,
          isPublished: true,
        },
      },
      { upsert: true },
    );
  }

  console.log(
    `Seeded/updated ${JEE_UNITS.length} ${TRACK} courses (shared Cloudinary video)`,
  );
}
