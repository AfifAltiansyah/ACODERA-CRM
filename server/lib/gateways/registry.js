const adapters = new Map()

export function register(name, adapter) {
  adapters.set(name, adapter)
}

export function getAdapter(name) {
  return adapters.get(name)
}

export function listAdapters() {
  return Array.from(adapters.keys())
}
