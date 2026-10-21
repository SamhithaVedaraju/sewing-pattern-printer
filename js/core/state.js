// The studio's working state: the garments being patterned and the user's size.

import { SIZES, DEFAULTS, isBodice } from './constants.js';

export const state = {
  /** Garments found in the photo or added by hand. */
  items: [],
  /** 'all' or the index of the one garment to print. */
  scope: 'all',
  /** The size applied to new garments; `bottom` overrides it for skirts and pants. */
  pref: { size: 'M', bottom: '', custom: { ...SIZES.M } },
  /** The cropped photo sent to Claude, kept for "Write new instructions". */
  photo: null,
  /** True once Claude answered in this view. */
  aiAvailable: false,
  /** 'best' uses Claude's most capable model; 'fast' its everyday one. */
  aiQuality: 'best',
};

/** A garment with sensible defaults for its type. */
export function newItem(type) {
  const [length, flare] = DEFAULTS[type];
  const { pref } = state;
  return {
    type,
    neck: 'round',
    sleeves: 'none',
    length,
    fit: 'regular',
    flare,
    waist: type === 'top' ? 40 : 100,
    close: 'zipper',
    size: (isBodice(type) ? '' : pref.bottom) || pref.size,
    custom: { ...pref.custom },
  };
}

/** "Dress", or "Top 2" when there is more than one of a type. */
export function itemLabel(i) {
  const { items } = state;
  const type = items[i].type;
  const total = items.filter((x) => x.type === type).length;
  const nth = items.slice(0, i + 1).filter((x) => x.type === type).length;
  return type.charAt(0).toUpperCase() + type.slice(1) + (total > 1 ? ' ' + nth : '');
}

/** Body measurements (cm) for a garment's chosen size. */
export const measurementsOf = (item) => (item.size === 'Custom' ? item.custom : SIZES[item.size]);

/** Indexes of the garments currently selected for printing. */
export const activeIndexes = () =>
  state.scope === 'all' ? state.items.map((_, i) => i) : [Number(state.scope)];

/** Options that change the sewing steps. Claude's steps are reused only while this matches. */
export const optionKey = (it) => [it.type, it.sleeves, it.neck, it.close, it.length, it.fit].join('|');
