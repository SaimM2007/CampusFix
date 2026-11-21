export function number(value?: number) {
  if (value === undefined || value === null) return "Not available";
  return new Intl.NumberFormat("en-US").format(value);
}

export function percent(value?: number) {
  if (value === undefined || value === null) return "Not available";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return `${value > 0 ? "+" : ""}${formatted}%`;
}

export function kwh(value?: number) {
  if (value === undefined || value === null) return "Not available";
  return `${number(value)} kWh`;
}
