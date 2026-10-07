export function indexFingerprintRow(a) {
  return [a.id, a.slug, a.title, a.summary, a.category, a.publishedAt,
    (a.tags ?? []).join("\u0001"), `${a.author.name}/${a.author.role}`,
    a.imageUrl, a.type, a.isBreaking, a.sponsor ?? ""].join("\u0000");
}
