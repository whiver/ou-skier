"use client";

type FavoriteResortButtonProps = {
  isFavorite: boolean;
  resortName: string;
  onToggleFavorite: () => void;
};

export default function FavoriteResortButton({
  isFavorite,
  resortName,
  onToggleFavorite,
}: FavoriteResortButtonProps) {
  const label = isFavorite
    ? `Retirer « ${resortName} » des favoris`
    : `Ajouter « ${resortName} » aux favoris`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isFavorite}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggleFavorite();
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
        isFavorite
          ? "border-amber-300 bg-amber-50 text-amber-500 hover:border-amber-400 hover:bg-amber-100"
          : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-amber-500"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill={isFavorite ? "currentColor" : "none"}
        className="h-4 w-4"
      >
        <path
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.072 3.298a1 1 0 0 0 .95.69h3.468c.969 0 1.371 1.24.588 1.81l-2.805 2.037a1 1 0 0 0-.364 1.118l1.071 3.298c.3.922-.755 1.688-1.539 1.118l-2.804-2.037a1 1 0 0 0-1.176 0l-2.804 2.037c-.784.57-1.838-.196-1.539-1.118l1.071-3.298a1 1 0 0 0-.364-1.118L2.97 8.725c-.783-.57-.38-1.81.588-1.81h3.468a1 1 0 0 0 .95-.69l1.072-3.298Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}