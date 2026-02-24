"use client";

/**
 * Rendert Fließtext mit klickbaren Unternehmenslinks.
 * Unternehmen aus entityLinks werden als Links dargestellt, wenn eine URL vorhanden ist.
 * Ohne URL: kein Link (nur normaler Text).
 */
export type EntityLink = { name: string; url?: string | null };

interface TextWithCompanyLinksProps {
  /** Der anzuzeigende Text */
  text: string;
  /** Unternehmen mit optionaler URL – nur mit URL werden Links gerendert */
  entityLinks?: EntityLink[];
  /** Zusätzliche CSS-Klassen für den Container */
  className?: string;
  /** Zusätzliche Klassen für Links */
  linkClassName?: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function TextWithCompanyLinks({
  text,
  entityLinks = [],
  className = "",
  linkClassName = "underline hover:text-foreground",
}: TextWithCompanyLinksProps) {
  const linksWithUrl = entityLinks.filter(
    (e): e is EntityLink & { url: string } =>
      !!e.url && typeof e.url === "string" && e.url.startsWith("http")
  );

  if (linksWithUrl.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sortiere nach Namenslänge absteigend, damit "Jack Wolfskin" vor "Jack" gematcht wird
  const sorted = [...linksWithUrl].sort((a, b) => b.name.length - a.name.length);

  type Segment = { type: "text"; value: string } | { type: "link"; name: string; url: string };
  const segments: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest: { index: number; length: number; url: string } | null = null;

    for (const { name, url } of sorted) {
      if (name.length === 0) continue;
      const pattern = new RegExp(escapeRegex(name), "gi");
      const index = remaining.search(pattern);
      if (index >= 0 && (earliest === null || index < earliest.index)) {
        earliest = { index, length: name.length, url };
      }
    }

    if (earliest === null) {
      segments.push({ type: "text", value: remaining });
      break;
    }

    if (earliest.index > 0) {
      segments.push({
        type: "text",
        value: remaining.slice(0, earliest.index),
      });
    }

    const matched = remaining.slice(earliest.index, earliest.index + earliest.length);
    segments.push({
      type: "link",
      name: matched,
      url: earliest.url,
    });

    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <a
            key={i}
            href={seg.url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {seg.name}
          </a>
        )
      )}
    </span>
  );
}
