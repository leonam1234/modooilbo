import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: Crumb[];
  align?: "left" | "center";
}) {
  return (
    <div className="paper-band border-b border-ink-200 dark:border-ink-800">
      <div className={`container-page py-8 sm:py-12 ${align === "center" ? "text-center" : ""}`}>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="breadcrumb"
            className={`mb-3 flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400 ${
              align === "center" ? "justify-center" : ""
            }`}
          >
            <Link href="/" className="hover:text-signal-600 dark:hover:text-signal-400">
              홈
            </Link>
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span aria-hidden>/</span>
                {b.href ? (
                  <Link href={b.href} className="hover:text-signal-600 dark:hover:text-signal-400">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink-600 dark:text-ink-300">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p
            className={`mt-3 text-ink-500 dark:text-ink-300 ${
              align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
