import React from "react";

const ArrowRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14m-7-7 7 7-7 7" />
  </svg>
);

const ArrowLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5m7 7-7-7 7-7" />
  </svg>
);

export function TransferButtons({ onMoveRight, onMoveLeft }) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onMoveRight}
        aria-label="Add selected students to batch"
        className="rounded-lg bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Move to right"
      >
        <ArrowRight aria-hidden="true" />
      </button>
      <button
        onClick={onMoveLeft}
        aria-label="Remove selected students from batch"
        className="rounded-lg bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Move to left"
      >
        <ArrowLeft aria-hidden="true" />
      </button>
    </div>
  );
}
