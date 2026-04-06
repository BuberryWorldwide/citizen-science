// Unified SVG icon system for Buberry Citizen Science.
// All icons: 24x24 viewBox, 1.5px stroke, round caps/joins.
// Pass size and color via props. Defaults to currentColor.

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

function I({ size = 24, color, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

// ── Map markers (tree categories) ──────────────────────────────

/** Generic deciduous tree — default for unknown species */
export function IconTree(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 22V14" />
      <path d="M12 14C8 14 5 10.5 5 7.5S8 2 12 2s7 2.5 7 5.5S16 14 12 14z" />
    </I>
  );
}

/** Fruit tree — apple, pear, cherry, plum, peach, fig, persimmon */
export function IconFruit(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 22V14" />
      <path d="M12 14C8 14 5 10.5 5 7.5S8 2 12 2s7 2.5 7 5.5S16 14 12 14z" />
      <circle cx="10" cy="8" r="1.5" fill={p.color || 'currentColor'} stroke="none" />
      <circle cx="14" cy="10" r="1.5" fill={p.color || 'currentColor'} stroke="none" />
    </I>
  );
}

/** Nut tree — pecan, walnut, hickory, chestnut */
export function IconNut(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 22V14" />
      <path d="M12 14C8 14 5 10.5 5 7.5S8 2 12 2s7 2.5 7 5.5S16 14 12 14z" />
      <ellipse cx="12" cy="9" rx="2.5" ry="3" fill={p.color || 'currentColor'} stroke="none" opacity="0.3" />
    </I>
  );
}

/** Citrus tree */
export function IconCitrus(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 22V14" />
      <path d="M12 14C8 14 5 10.5 5 7.5S8 2 12 2s7 2.5 7 5.5S16 14 12 14z" />
      <circle cx="12" cy="8.5" r="2.5" fill={p.color || 'currentColor'} stroke="none" opacity="0.3" />
    </I>
  );
}

/** Flowering/ornamental — Bradford Pear */
export function IconFlower(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 22V14" />
      <path d="M12 14C8 14 5 10.5 5 7.5S8 2 12 2s7 2.5 7 5.5S16 14 12 14z" />
      <path d="M12 5l1 2h2l-1.5 1.5.5 2L12 9.5 9.5 10.5l.5-2L8.5 7h2z" fill={p.color || 'currentColor'} stroke="none" opacity="0.4" />
    </I>
  );
}

/** Leaf / maple / oak */
export function IconLeaf(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 22V14" />
      <path d="M17 3C17 3 21 7 21 12c0 5-4 8-9 8s-9-3-9-8c0-5 4-9 4-9" />
      <path d="M12 6v8" />
      <path d="M9 10l3-2 3 2" />
    </I>
  );
}

// ── Navigation icons ───────────────────────────────────────────

export function IconMap(p: IconProps) {
  return (
    <I {...p}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" fill="none" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </I>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <I {...p}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </I>
  );
}

export function IconFolder(p: IconProps) {
  return (
    <I {...p}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </I>
  );
}

export function IconUser(p: IconProps) {
  return (
    <I {...p}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </I>
  );
}

// ── Stat / UI icons ────────────────────────────────────────────

export function IconStar(p: IconProps) {
  return (
    <I {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </I>
  );
}

export function IconCamera(p: IconProps) {
  return (
    <I {...p}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </I>
  );
}

export function IconEye(p: IconProps) {
  return (
    <I {...p}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </I>
  );
}

export function IconTrophy(p: IconProps) {
  return (
    <I {...p}>
      <path d="M6 9H3a1 1 0 01-1-1V5a1 1 0 011-1h3" />
      <path d="M18 9h3a1 1 0 001-1V5a1 1 0 00-1-1h-3" />
      <path d="M6 4h12v6a6 6 0 11-12 0V4z" />
      <path d="M9 18h6" />
      <path d="M12 16v2" />
      <path d="M8 22h8" />
      <path d="M10 18v4" />
      <path d="M14 18v4" />
    </I>
  );
}

export function IconFlame(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 22c-4 0-7-3-7-7.5C5 10 12 2 12 2s7 8 7 12.5c0 4.5-3 7.5-7 7.5z" />
      <path d="M12 22c-2 0-3.5-1.5-3.5-3.75C8.5 15.5 12 12 12 12s3.5 3.5 3.5 6.25C15.5 20.5 14 22 12 22z" />
    </I>
  );
}

export function IconTarget(p: IconProps) {
  return (
    <I {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </I>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <I {...p}>
      <polyline points="20 6 9 17 4 12" />
    </I>
  );
}

export function IconLayers(p: IconProps) {
  return (
    <I {...p}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </I>
  );
}

export function IconSun(p: IconProps) {
  return (
    <I {...p}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </I>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <I {...p}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </I>
  );
}

export function IconLogOut(p: IconProps) {
  return (
    <I {...p}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </I>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <I {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </I>
  );
}

export function IconHeat(p: IconProps) {
  return (
    <I {...p}>
      <circle cx="12" cy="12" r="3" opacity="0.9" />
      <circle cx="12" cy="12" r="6" opacity="0.4" />
      <circle cx="12" cy="12" r="9" opacity="0.15" />
    </I>
  );
}

export function IconFilter(p: IconProps) {
  return (
    <I {...p}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </I>
  );
}

export function IconBook(p: IconProps) {
  return (
    <I {...p}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </I>
  );
}

export function IconAward(p: IconProps) {
  return (
    <I {...p}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </I>
  );
}

export function IconChart(p: IconProps) {
  return (
    <I {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </I>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <I {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </I>
  );
}

export function IconLock(p: IconProps) {
  return (
    <I {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </I>
  );
}

export function IconX(p: IconProps) {
  return (
    <I {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </I>
  );
}

export function IconAlertTriangle(p: IconProps) {
  return (
    <I {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </I>
  );
}

export function IconHelpCircle(p: IconProps) {
  return (
    <I {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </I>
  );
}

export function IconClipboard(p: IconProps) {
  return (
    <I {...p}>
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </I>
  );
}

export function IconFlag(p: IconProps) {
  return (
    <I {...p}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </I>
  );
}

// ── Species → icon category mapping ────────────────────────────

export type TreeCategory = 'fruit' | 'nut' | 'citrus' | 'flower' | 'leaf' | 'tree';

const SPECIES_CATEGORY: Record<string, TreeCategory> = {
  'Apple': 'fruit', 'Pear': 'fruit', 'Cherry': 'fruit', 'Plum': 'fruit',
  'Peach': 'fruit', 'Fig': 'fruit', 'Persimmon': 'fruit', 'Muscadine': 'fruit',
  'Pawpaw': 'fruit', 'Mulberry': 'fruit',
  'Pecan': 'nut', 'Walnut': 'nut', 'Hickory': 'nut', 'Chestnut': 'nut',
  'Citrus': 'citrus',
  'Bradford Pear': 'flower',
  'Oak': 'leaf', 'Maple': 'leaf',
};

export function getTreeCategory(species?: string | null): TreeCategory {
  if (!species) return 'tree';
  return SPECIES_CATEGORY[species] || 'tree';
}

const CATEGORY_COLORS: Record<TreeCategory, string> = {
  fruit: '#34d399',    // accent green
  nut: '#d97706',      // warm amber
  citrus: '#fbbf24',   // yellow
  flower: '#f472b6',   // pink
  leaf: '#60a5fa',     // blue
  tree: '#8890a4',     // muted default
};

export function getCategoryColor(cat: TreeCategory): string {
  return CATEGORY_COLORS[cat];
}

export function TreeIcon({ species, size = 24 }: { species?: string | null; size?: number }) {
  const cat = getTreeCategory(species);
  const color = getCategoryColor(cat);
  const props = { size, color };
  switch (cat) {
    case 'fruit': return <IconFruit {...props} />;
    case 'nut': return <IconNut {...props} />;
    case 'citrus': return <IconCitrus {...props} />;
    case 'flower': return <IconFlower {...props} />;
    case 'leaf': return <IconLeaf {...props} />;
    default: return <IconTree {...props} />;
  }
}
