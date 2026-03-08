"use client";

import { useState } from "react";

export default function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-6">Welcome to Mizo Mastery</h1>

      <p className="mb-4">
        This is the home page. Use the navigation to explore the app.
      </p>

      <button
        onClick={() => setCount(count + 1)}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Clicked {count} times
      </button>
    </main>
  );
}
