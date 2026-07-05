export function cellsFor(origin, orientation, size) {
  const [r, c] = origin;
  return Array.from({ length: size }, (_, i) =>
    orientation === 'H' ? [r, c + i] : [r + i, c]
  );
}
