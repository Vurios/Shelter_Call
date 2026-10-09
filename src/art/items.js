/** Reuse our original meter kit; labels distinguish the electron prediction sensor. */
export const itemIcon = (type) => (type === 'electron' ? 'dosimeter' : type);
export const itemModel = (type) =>
  type === 'bolt' ? 'bolt' : `item-${type === 'electron' ? 'dosimeter' : type}`;
