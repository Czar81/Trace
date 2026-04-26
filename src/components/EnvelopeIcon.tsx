import React from 'react';
import {
  Home, Car, Coffee, ShoppingBag, Heart, Zap, Film, Music,
  BookOpen, GraduationCap, Briefcase, Gift, Plane, Gamepad2,
  Smartphone, DollarSign, PiggyBank, Utensils, ShoppingCart,
  Bus, Wallet, CreditCard, Dumbbell, Baby, Dog, Wrench, Scissors,
  Globe, Building2, Star, Bike, Beef, Pizza, Tv, Shirt, Fuel,
  TreePine, Stethoscope, Beer, Box,
} from 'lucide-react-native';

export type IconName =
  | 'home' | 'car' | 'coffee' | 'shopping-bag' | 'heart' | 'zap' | 'film'
  | 'music' | 'book' | 'graduation-cap' | 'briefcase' | 'gift' | 'plane'
  | 'gamepad' | 'smartphone' | 'dollar' | 'piggy-bank' | 'utensils'
  | 'shopping-cart' | 'bus' | 'wallet' | 'credit-card' | 'dumbbell'
  | 'baby' | 'dog' | 'wrench' | 'scissors' | 'globe' | 'building'
  | 'star' | 'bike' | 'beef' | 'pizza' | 'tv' | 'shirt' | 'fuel'
  | 'tree' | 'stethoscope' | 'beer' | 'box';

export const ICON_LIST: IconName[] = [
  'home', 'car', 'coffee', 'shopping-bag', 'heart', 'zap', 'film',
  'music', 'book', 'graduation-cap', 'briefcase', 'gift', 'plane',
  'gamepad', 'smartphone', 'dollar', 'piggy-bank', 'utensils',
  'shopping-cart', 'bus', 'wallet', 'credit-card', 'dumbbell',
  'baby', 'dog', 'wrench', 'scissors', 'globe', 'building',
  'star', 'bike', 'beef', 'pizza', 'tv', 'shirt', 'fuel',
  'tree', 'stethoscope', 'beer', 'box',
];

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
