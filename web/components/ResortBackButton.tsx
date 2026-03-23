"use client";

import { useRouter } from "next/navigation";

export default function ResortBackButton() {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-blue-600"
    >
      ← Retour
    </button>
  );
}