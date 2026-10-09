(function (window) {
  "use strict";

  const copy = (position) => ({ x: position?.x ?? null, y: position?.y ?? null });
  const same = (a, b) => (a?.x ?? null) === (b?.x ?? null) && (a?.y ?? null) === (b?.y ?? null);

  function create(options) {
    const limit = Math.max(1, Number(options?.historyLimit) || 5);
    const confirmed = new Map();
    const current = new Map();
    let history = [];

    function load(entries) {
      confirmed.clear();
      current.clear();
      history = [];
      for (const entry of entries || []) {
        confirmed.set(String(entry.id), copy(entry.position));
        current.set(String(entry.id), copy(entry.position));
      }
    }

    function move(id, position) {
      const key = String(id);
      const before = current.has(key) ? current.get(key) : { x: null, y: null };
      const after = copy(position);
      if (same(before, after)) return false;
      history.push({ id: key, before: copy(before), after: copy(after) });
      if (history.length > limit) history = history.slice(-limit);
      current.set(key, after);
      return true;
    }

    function undo() {
      const entry = history.pop();
      if (!entry) return null;
      current.set(entry.id, copy(entry.before));
      return { id: entry.id, position: copy(entry.before) };
    }

    function pending() {
      const result = [];
      for (const [id, position] of current) {
        if (!same(position, confirmed.get(id))) result.push({ id, position: copy(position) });
      }
      return result;
    }

    function confirm(id, position) {
      const key = String(id);
      const saved = copy(position ?? current.get(key));
      confirmed.set(key, saved);
      current.set(key, copy(saved));
      history = history.filter((entry) => entry.id !== key);
    }

    function discard() {
      const restored = pending().map((entry) => ({ id: entry.id, position: copy(confirmed.get(entry.id)) }));
      for (const entry of restored) current.set(entry.id, copy(entry.position));
      history = [];
      return restored;
    }

    return {
      load,
      move,
      undo,
      pending,
      confirm,
      discard,
      position: (id) => copy(current.get(String(id))),
      hasChanges: () => pending().length > 0,
      canUndo: () => history.length > 0,
    };
  }

  const sources = new Map();
  const registry = {
    register(name, source) {
      sources.set(String(name), source);
      return () => sources.delete(String(name));
    },
    hasChanges() {
      return Array.from(sources.values()).some((source) => source.isDirty());
    },
    async saveAll() {
      for (const source of sources.values()) {
        if (source.isDirty() && (await source.save()) !== true) return false;
      }
      return true;
    },
    discardAll() {
      for (const source of sources.values()) if (source.isDirty()) source.discard();
    },
  };

  window.WhispersMapDraft = { create, registry };
})(window);
