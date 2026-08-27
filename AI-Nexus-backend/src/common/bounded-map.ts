/** Insertion-order map that drops the oldest entry when full. */
export class BoundedMap<K, V> extends Map<K, V> {
  constructor(private readonly maxSize: number) {
    super();
  }

  override set(key: K, value: V): this {
    if (this.has(key)) {
      this.delete(key);
    } else if (this.size >= this.maxSize) {
      const oldest = this.keys().next().value;
      if (oldest !== undefined) this.delete(oldest);
    }
    return super.set(key, value);
  }
}

/** Insertion-order set that drops the oldest value when full. */
export class BoundedSet<T> {
  private readonly map: BoundedMap<T, true>;

  constructor(maxSize: number) {
    this.map = new BoundedMap(maxSize);
  }

  get size(): number {
    return this.map.size;
  }

  has(value: T): boolean {
    return this.map.has(value);
  }

  add(value: T): this {
    this.map.set(value, true);
    return this;
  }

  delete(value: T): boolean {
    return this.map.delete(value);
  }

  clear(): void {
    this.map.clear();
  }
}
