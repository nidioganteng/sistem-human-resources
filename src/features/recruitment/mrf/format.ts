export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' });

export const TRACK_LABEL = { fast: 'Fast (langsung wawancara)', normal: 'Normal (uji kompetensi lalu wawancara)' } as const;
