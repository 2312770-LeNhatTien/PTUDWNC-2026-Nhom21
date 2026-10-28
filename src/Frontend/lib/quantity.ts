// D10: không parse "1/2" thành 1; NaN yêu cầu form báo lỗi trước khi gọi API.
export function parseQuantity(value: string): number | null {
  const input = value.trim().replace(',', '.');
  if (!input) return null;
  const fraction = /^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/.exec(input);
  const result = fraction
    ? Number(fraction[1] || 0) + Number(fraction[2]) / Number(fraction[3])
    : /^\d+(?:\.\d+)?$/.test(input) ? Number(input) : Number.NaN;
  return Number.isFinite(result) && result > 0 ? result : Number.NaN;
}
