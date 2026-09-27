import { splitHighlightedParts } from './searchText';

export function HighlightedSearchText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const parts = splitHighlightedParts(text, query);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.hit ? (
          <mark
            key={`${part.text}-${index}`}
            className="bg-amber-200/90 dark:bg-amber-400/25 text-inherit rounded-sm px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}
