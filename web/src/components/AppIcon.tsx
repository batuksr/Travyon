import {
  Armchair, Backpack, Banknote, BedSingle, Bell, BellOff, Bike, BookOpen,
  BriefcaseBusiness, CalendarDays, CarFront, CarTaxiFront, Check, CircleCheck,
  CircleHelp, CircleOff, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain,
  CloudSnow, CloudSun, Coffee, Compass, CreditCard, Crown, FileText, Fish, Flag,
  Footprints, Gem, Globe, Handshake, Heart, Hospital, Hotel, Hourglass, House,
  Landmark, Leaf, Lightbulb, LockKeyhole, Mail, Map, MapPin, MapPinned, Medal,
  MoonStar, Mountain, Music2, PartyPopper, Plane, Plug, Search, Settings2,
  ShieldCheck, Shirt, Shuffle, Snowflake, Sparkles, Sprout, Star, Store, Sun,
  Sunset, Thermometer, Ticket, TramFront, TreePalm, Trees, TriangleAlert,
  Trophy, Umbrella, UserRound, Users, Utensils, UtensilsCrossed, Wallet,
  Waves, WheatOff, Wind, Wine, X, Zap, Luggage,
} from 'lucide-react';

const icons = {
  armchair: Armchair, backpack: Backpack, banknote: Banknote, bed: BedSingle,
  bell: Bell, 'bell-off': BellOff, bike: Bike, book: BookOpen, briefcase: BriefcaseBusiness,
  calendar: CalendarDays, car: CarFront, taxi: CarTaxiFront, check: Check,
  'circle-check': CircleCheck, help: CircleHelp, 'circle-off': CircleOff,
  cloud: Cloud, drizzle: CloudDrizzle, fog: CloudFog, storm: CloudLightning,
  rain: CloudRain, snow: CloudSnow, 'cloud-sun': CloudSun, coffee: Coffee,
  compass: Compass, 'credit-card': CreditCard, crown: Crown, document: FileText,
  fish: Fish, flag: Flag, walk: Footprints, gem: Gem, globe: Globe,
  handshake: Handshake, heart: Heart, hospital: Hospital, hotel: Hotel,
  hourglass: Hourglass, house: House, landmark: Landmark, leaf: Leaf,
  lightbulb: Lightbulb, lock: LockKeyhole, mail: Mail, map: Map, 'map-pin': MapPin,
  'map-pinned': MapPinned, medal: Medal, moon: MoonStar, mountain: Mountain,
  music: Music2, party: PartyPopper, plane: Plane, plug: Plug, search: Search,
  settings: Settings2, shield: ShieldCheck, shirt: Shirt, shuffle: Shuffle,
  snowflake: Snowflake, sparkles: Sparkles, sprout: Sprout, star: Star,
  store: Store, sun: Sun, sunset: Sunset, thermometer: Thermometer, ticket: Ticket,
  transit: TramFront, palm: TreePalm, trees: Trees, warning: TriangleAlert,
  trophy: Trophy, umbrella: Umbrella, user: UserRound, users: Users, utensils: Utensils,
  food: UtensilsCrossed, wallet: Wallet, waves: Waves, 'wheat-off': WheatOff,
  wind: Wind, wine: Wine, x: X, zap: Zap, luggage: Luggage,
};

interface AppIconProps {
  name: string;
  size?: number;
  className?: string;
  label?: string;
}

/** Shared, decorative UI icons. Labels stay in text for accessibility and translation. */
export default function AppIcon({ name, size = 18, className = '', label }: AppIconProps) {
  const Icon = icons[name as keyof typeof icons] ?? Compass;
  return <Icon
    size={size} strokeWidth={1.65}
    className={`inline-block shrink-0 align-middle ${className}`}
    aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}
  />;
}
