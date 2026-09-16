import Head from "next/head";
import { useCallback, useState } from "react";
import Navbar from "../components/Navbar";

const DEMO_OPTIONS = [
  { id: "intro", label: "Intro", file: "Intro.mp4" },
  { id: "home", label: "Home", file: "HomePage.mp4" },
  { id: "signup", label: "Sign Up / Sign In", file: "SignUp-SignIn.mp4" },
  { id: "students", label: "Students", file: "StudentPage.mp4" },
  { id: "staff", label: "Staff", file: "StaffPage.mp4" },
  { id: "batches", label: "Batches", file: "BatchesPage.mp4" },
  { id: "courses", label: "Courses", file: "CoursesPage.mp4" },
  { id: "reports", label: "Reports", file: "ReportPage.mp4" },
];

function getVideoSrc(filename) {
  return `/videos/${encodeURIComponent(filename)}`;
}

export default function Demo() {
  const [selectedId, setSelectedId] = useState("intro");

  const selected = DEMO_OPTIONS.find((o) => o.id === selectedId) ?? DEMO_OPTIONS[0];
  const videoSrc = getVideoSrc(selected.file);

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
  }, []);

  return (
    <>
      <Navbar className="w-full" />
      <Head>
        <title>Check Out Demo – Vision-Aid STATS</title>
        <meta name="description" content="Watch demo videos for each page of the Vision-Aid STATS app" />
      </Head>
      <main className="mt-16 flex flow-root min-h-[65vh] flex-1 flex-col justify-start px-2 pt-10">
        <h1 className="m-0 pt-0 text-center text-[1.7em] font-extralight leading-tight text-[#0b751f]">
          Check Out Demo
        </h1>
        <p className="mb-0 mt-4 text-center text-2xl">Select a page to play its demo video</p>

        <div className="mx-auto my-8 max-w-[900px] px-4">
          <h2 className="mb-4 text-center">{selected.label}</h2>
          <video
            key={videoSrc}
            src={videoSrc}
            controls
            playsInline
            className="w-full rounded-lg border border-[#0b751f] bg-black"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          {DEMO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`font-inherit flex min-h-11 min-w-[120px] max-w-[120px] cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors duration-150 ${
                selectedId === opt.id
                  ? "border-[#0b751f] bg-[#0b751f] text-white"
                  : "border-black bg-transparent hover:border-[#0b751f] hover:bg-[#0b751f] hover:text-white"
              } `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
