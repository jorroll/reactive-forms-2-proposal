export function cloneJSON<T>(item: T): T {
  return JSON.parse(
    JSON.stringify(item)
  )
}