export const toCents = (value: number | string) => Math.round(Number(value) * 100);
export const money = (cents: bigint | number | string) => Number(cents) / 100;
