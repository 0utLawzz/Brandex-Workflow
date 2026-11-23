type Page<T> = { data: T[] | null; error: { message: string } | null; count: number | null };

/** Descending keyset pagination also works when the API caps pages below our limit. */
export async function readAllRows<T extends { id: number | string }>(fetchPage: (before: number | null) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  let before: number | null = null;
  let expected: number | null = null;
  for (;;) {
    const page = await fetchPage(before);
    if (page.error) throw new Error(page.error.message);
    if (!Array.isArray(page.data) || !Number.isSafeInteger(page.count) || Number(page.count) < 0) throw new Error('Incomplete database page or row count.');
    // Counts after the first page describe the remaining keyset, not total rows.
    if (expected === null) expected = page.count;
    else if (page.count !== expected - rows.length) throw new Error('Dataset changed during reading. Reload and retry.');
    if (!page.data.length) break;
    for (const row of page.data) {
      const id = Number(row.id);
      if (!Number.isSafeInteger(id) || id <= 0 || (before !== null && id >= before)) throw new Error('Invalid or unordered database page.');
      before = id;
      rows.push(row);
    }
  }
  if (rows.length !== expected) throw new Error('Database read ended before all rows were returned.');
  return rows;
}
