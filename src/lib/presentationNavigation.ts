export function nextSlide(current: number, total: number) {
  return total <= 0 ? 0 : Math.min(total - 1, current + 1)
}
export function previousSlide(current: number) {
  return Math.max(0, current - 1)
}
