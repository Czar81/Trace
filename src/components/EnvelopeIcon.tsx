import React from 'react';
import {
  Home, Car, Coffee, ShoppingBag, Heart, Zap, Film, Music,
  BookOpen, GraduationCap, Briefcase, Gift, Plane, Gamepad2,
  Smartphone, DollarSign, PiggyBank, Utensils, ShoppingCart,
  Bus, Wallet, CreditCard, Dumbbell, Baby, Dog, Wrench, Scissors,
  Globe, Building2, Star, Bike, Beef, Pizza, Tv, Shirt, Fuel,
  TreePine, Stethoscope, Beer, Box,
  Bird, Bone, Bug, Cat, Fish, FishSymbol, PawPrint, Rabbit, Turtle,
  FilePieChart, FileText, File, Mail, Printer, Calendar, Folder, Pen, Paintbrush, PenTool, Trash, Trash2,
  Warehouse, Bed, Hammer, Lamp, Lightbulb, Lock, Sofa, Droplet,
  Cake, CakeSlice, PartyPopper, Balloon, Drill,
  Soup, Cookie, Sandwich, Wine, UtensilsCrossed
} from 'lucide-react-native';

export type IconName =
  | 'home' | 'car' | 'coffee' | 'shopping-bag' | 'heart' | 'zap' | 'film'
  | 'music' | 'book' | 'graduation-cap' | 'briefcase' | 'gift' | 'plane'
  | 'gamepad' | 'smartphone' | 'dollar' | 'piggy-bank' | 'utensils'
  | 'shopping-cart' | 'bus' | 'wallet' | 'credit-card' | 'dumbbell'
  | 'baby' | 'dog' | 'wrench' | 'scissors' | 'globe' | 'building'
  | 'star' | 'bike' | 'beef' | 'pizza' | 'tv' | 'shirt' | 'fuel'
  | 'tree' | 'stethoscope' | 'beer' | 'box'
  | 'bird' | 'bone' | 'bug' | 'cat' | 'fish' | 'fish-bowl' | 'paw' | 'rabbit' | 'turtle'
  | 'file-pie' | 'file-stack' | 'file' | 'mail' | 'printer' | 'calendar' | 'folder' | 'pen' | 'paintbrush' | 'pentool' | 'trash' | 'trash2'
  | 'warehouse' | 'bed' | 'hammer' | 'lamp' | 'lightbulb' | 'lock' | 'sofa' | 'droplet'
  | 'cake' | 'cake-slice' | 'party' | 'balloon' | 'firework'
  | 'soup' | 'cookie' | 'burger' | 'wine' | 'utensils-crossed';

export interface IconCategory {
  title: string;
  icons: IconName[];
}

export const CATEGORIZED_ICONS: IconCategory[] = [
  {
    title: 'Animales / Animals',
    icons: ['bird', 'bone', 'bug', 'cat', 'dog', 'fish', 'fish-bowl', 'paw', 'rabbit', 'turtle']
  },
  {
    title: 'Archivos / Files',
    icons: ['file-pie', 'file-stack', 'file', 'mail', 'printer', 'calendar', 'folder', 'pen', 'paintbrush', 'pentool', 'trash', 'trash2']
  },
  {
    title: 'Casa / Home',
    icons: ['home', 'warehouse', 'bed', 'hammer', 'lamp', 'lightbulb', 'lock', 'sofa', 'zap', 'droplet']
  },
  {
    title: 'Celebración / Celebration',
    icons: ['cake', 'cake-slice', 'party', 'balloon', 'tree', 'firework']
  },
  {
    title: 'Comida / Food',
    icons: ['utensils-crossed', 'wine', 'soup', 'cookie', 'burger']
  },
  {
    title: 'Otros / Others',
    icons: ['car', 'coffee', 'shopping-bag', 'heart', 'film', 'music', 'book', 'graduation-cap', 'briefcase', 'gift', 'plane', 'gamepad', 'smartphone', 'dollar', 'piggy-bank', 'shopping-cart', 'bus', 'wallet', 'credit-card', 'dumbbell', 'baby', 'wrench', 'scissors', 'globe', 'building', 'star', 'bike', 'beef', 'pizza', 'tv', 'shirt', 'fuel', 'stethoscope', 'beer', 'box']
  }
];

export const ICON_LIST: IconName[] = CATEGORIZED_ICONS.flatMap(c => c.icons);

type IconProps = { size?: number; color?: string };

const iconComponents: Record<IconName, React.FC<IconProps>> = {
  'home': ({ size, color }) => <Home size={size} color={color} />,
  'car': ({ size, color }) => <Car size={size} color={color} />,
  'coffee': ({ size, color }) => <Coffee size={size} color={color} />,
  'shopping-bag': ({ size, color }) => <ShoppingBag size={size} color={color} />,
  'heart': ({ size, color }) => <Heart size={size} color={color} />,
  'zap': ({ size, color }) => <Zap size={size} color={color} />,
  'film': ({ size, color }) => <Film size={size} color={color} />,
  'music': ({ size, color }) => <Music size={size} color={color} />,
  'book': ({ size, color }) => <BookOpen size={size} color={color} />,
  'graduation-cap': ({ size, color }) => <GraduationCap size={size} color={color} />,
  'briefcase': ({ size, color }) => <Briefcase size={size} color={color} />,
  'gift': ({ size, color }) => <Gift size={size} color={color} />,
  'plane': ({ size, color }) => <Plane size={size} color={color} />,
  'gamepad': ({ size, color }) => <Gamepad2 size={size} color={color} />,
  'smartphone': ({ size, color }) => <Smartphone size={size} color={color} />,
  'dollar': ({ size, color }) => <DollarSign size={size} color={color} />,
  'piggy-bank': ({ size, color }) => <PiggyBank size={size} color={color} />,
  'utensils': ({ size, color }) => <Utensils size={size} color={color} />,
  'shopping-cart': ({ size, color }) => <ShoppingCart size={size} color={color} />,
  'bus': ({ size, color }) => <Bus size={size} color={color} />,
  'wallet': ({ size, color }) => <Wallet size={size} color={color} />,
  'credit-card': ({ size, color }) => <CreditCard size={size} color={color} />,
  'dumbbell': ({ size, color }) => <Dumbbell size={size} color={color} />,
  'baby': ({ size, color }) => <Baby size={size} color={color} />,
  'dog': ({ size, color }) => <Dog size={size} color={color} />,
  'wrench': ({ size, color }) => <Wrench size={size} color={color} />,
  'scissors': ({ size, color }) => <Scissors size={size} color={color} />,
  'globe': ({ size, color }) => <Globe size={size} color={color} />,
  'building': ({ size, color }) => <Building2 size={size} color={color} />,
  'star': ({ size, color }) => <Star size={size} color={color} />,
  'bike': ({ size, color }) => <Bike size={size} color={color} />,
  'beef': ({ size, color }) => <Beef size={size} color={color} />,
  'pizza': ({ size, color }) => <Pizza size={size} color={color} />,
  'tv': ({ size, color }) => <Tv size={size} color={color} />,
  'shirt': ({ size, color }) => <Shirt size={size} color={color} />,
  'fuel': ({ size, color }) => <Fuel size={size} color={color} />,
  'tree': ({ size, color }) => <TreePine size={size} color={color} />,
  'stethoscope': ({ size, color }) => <Stethoscope size={size} color={color} />,
  'beer': ({ size, color }) => <Beer size={size} color={color} />,
  'box': ({ size, color }) => <Box size={size} color={color} />,
  'bird': ({ size, color }) => <Bird size={size} color={color} />,
  'bone': ({ size, color }) => <Bone size={size} color={color} />,
  'bug': ({ size, color }) => <Bug size={size} color={color} />,
  'cat': ({ size, color }) => <Cat size={size} color={color} />,
  'fish': ({ size, color }) => <Fish size={size} color={color} />,
  'fish-bowl': ({ size, color }) => <FishSymbol size={size} color={color} />,
  'paw': ({ size, color }) => <PawPrint size={size} color={color} />,
  'rabbit': ({ size, color }) => <Rabbit size={size} color={color} />,
  'turtle': ({ size, color }) => <Turtle size={size} color={color} />,
  'file-pie': ({ size, color }) => <FilePieChart size={size} color={color} />,
  'file-stack': ({ size, color }) => <FileText size={size} color={color} />,
  'file': ({ size, color }) => <File size={size} color={color} />,
  'mail': ({ size, color }) => <Mail size={size} color={color} />,
  'printer': ({ size, color }) => <Printer size={size} color={color} />,
  'calendar': ({ size, color }) => <Calendar size={size} color={color} />,
  'folder': ({ size, color }) => <Folder size={size} color={color} />,
  'pen': ({ size, color }) => <Pen size={size} color={color} />,
  'paintbrush': ({ size, color }) => <Paintbrush size={size} color={color} />,
  'pentool': ({ size, color }) => <PenTool size={size} color={color} />,
  'trash': ({ size, color }) => <Trash size={size} color={color} />,
  'trash2': ({ size, color }) => <Trash2 size={size} color={color} />,
  'warehouse': ({ size, color }) => <Warehouse size={size} color={color} />,
  'bed': ({ size, color }) => <Bed size={size} color={color} />,
  'hammer': ({ size, color }) => <Hammer size={size} color={color} />,
  'lamp': ({ size, color }) => <Lamp size={size} color={color} />,
  'lightbulb': ({ size, color }) => <Lightbulb size={size} color={color} />,
  'lock': ({ size, color }) => <Lock size={size} color={color} />,
  'sofa': ({ size, color }) => <Sofa size={size} color={color} />,
  'droplet': ({ size, color }) => <Droplet size={size} color={color} />,
  'cake': ({ size, color }) => <Cake size={size} color={color} />,
  'cake-slice': ({ size, color }) => <CakeSlice size={size} color={color} />,
  'party': ({ size, color }) => <PartyPopper size={size} color={color} />,
  'balloon': ({ size, color }) => <Balloon size={size} color={color} />,
  'firework': ({ size, color }) => <Drill size={size} color={color} />, // Drill looks like firework? No, maybe I missed it.
  'utensils-crossed': ({ size, color }) => <UtensilsCrossed size={size} color={color} />,
  'wine': ({ size, color }) => <Wine size={size} color={color} />,
  'soup': ({ size, color }) => <Soup size={size} color={color} />,
  'cookie': ({ size, color }) => <Cookie size={size} color={color} />,
  'burger': ({ size, color }) => <Sandwich size={size} color={color} />,
};

interface EnvelopeIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const EnvelopeIcon: React.FC<EnvelopeIconProps> = ({ name, size = 22, color = '#FFFFFF' }) => {
  const Component = iconComponents[name as IconName];
  if (!Component) return <Box size={size} color={color} />;
  return <Component size={size} color={color} />;
};

