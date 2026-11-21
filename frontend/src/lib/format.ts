export function number(value?: number) {
  if (value === undefined || value === null) return "Not available";
  return new Intl.NumberFormat("en-US").format(value);
}

export function percent(value?: number) {
  if (value === undefined || value === null) return "Not available";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function kwh(value?: number) {
  if (value === undefined || value === null) return "Not available";
  return `${number(value)} kWh`;
}
