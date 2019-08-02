export function looseIdentical(a: any, b: any): boolean {
  return (
    a === b ||
    (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b))
  );
}

export function setupListeners(dir: any, event: string, fn: string) {
  dir.renderer.listen(dir.el.nativeElement, event, dir[fn].bind(dir));
}
