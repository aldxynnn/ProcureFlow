import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
function Icon({ size = 18, children, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}
export const GridIcon = (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Icon>;
export const FileTextIcon = (p: IconProps) => <Icon {...p}><path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/></Icon>;
export const RepeatIcon = (p: IconProps) => <Icon {...p}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></Icon>;
export const ShoppingCartIcon = (p: IconProps) => <Icon {...p}><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L20.5 8H6"/></Icon>;
export const ReceiptIcon = (p: IconProps) => <Icon {...p}><path d="M5 3.5v17l3-1.8 3 1.8 3-1.8 3 1.8v-17"/><path d="M8 8h6M8 11.5h6M8 15h4"/></Icon>;
export const UserIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.8-3.4 3.2-5.2 7-5.2s6.2 1.8 7 5.2"/></Icon>;
export const BuildingIcon = (p: IconProps) => <Icon {...p}><path d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17"/><path d="M15 9h4a1 1 0 0 1 1 1v11M8 7h4M8 11h4M8 15h4M8 19h4M2 21h20"/></Icon>;
export const WalletIcon = (p: IconProps) => <Icon {...p}><path d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13"/><path d="M16 13h5"/><circle cx="16" cy="13" r=".8" fill="currentColor" stroke="none"/></Icon>;
export const ShieldIcon = (p: IconProps) => <Icon {...p}><path d="M12 3l7 3v5c0 4.4-2.7 8-7 10-4.3-2-7-5.6-7-10V6z"/><path d="M9 12l2 2 4-4"/></Icon>;
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></Icon>;
export const BellIcon = (p: IconProps) => <Icon {...p}><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></Icon>;
export const ChevronDownIcon = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
export const ArrowUpRightIcon = (p: IconProps) => <Icon {...p}><path d="M7 17L17 7M9 7h8v8"/></Icon>;
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
export const SlidersIcon = (p: IconProps) => <Icon {...p}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></Icon>;
export const MoreIcon = (p: IconProps) => <Icon {...p}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></Icon>;
export const LogoutIcon = (p: IconProps) => <Icon {...p}><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5"/><path d="M14 8l4 4-4 4M18 12H8"/></Icon>;
export const CommandIcon = (p: IconProps) => <Icon {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 8.5v7M15 8.5v7M8.5 9h7M8.5 15h7"/></Icon>;
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="M5 12l4 4L19 6"/></Icon>;
export const ClockIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></Icon>;
export const XIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>;
export const MenuIcon = (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16"/></Icon>;
