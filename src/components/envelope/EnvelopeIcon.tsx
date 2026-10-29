import React from 'react';
import { TranslationKey } from '../../i18n';
import Home from 'lucide-react-native/icons/house';
import Car from 'lucide-react-native/icons/car';
import Coffee from 'lucide-react-native/icons/coffee';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Heart from 'lucide-react-native/icons/heart';
import Zap from 'lucide-react-native/icons/zap';
import Film from 'lucide-react-native/icons/film';
import Music from 'lucide-react-native/icons/music';
import BookOpen from 'lucide-react-native/icons/book-open';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Gift from 'lucide-react-native/icons/gift';
import Plane from 'lucide-react-native/icons/plane';
import Gamepad2 from 'lucide-react-native/icons/gamepad-2';
import Smartphone from 'lucide-react-native/icons/smartphone';
import DollarSign from 'lucide-react-native/icons/dollar-sign';
import PiggyBank from 'lucide-react-native/icons/piggy-bank';
import Utensils from 'lucide-react-native/icons/utensils';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Bus from 'lucide-react-native/icons/bus';
import Wallet from 'lucide-react-native/icons/wallet';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Baby from 'lucide-react-native/icons/baby';
import Dog from 'lucide-react-native/icons/dog';
import Wrench from 'lucide-react-native/icons/wrench';
import Scissors from 'lucide-react-native/icons/scissors';
import Globe from 'lucide-react-native/icons/globe';
import Building2 from 'lucide-react-native/icons/building-2';
import Star from 'lucide-react-native/icons/star';
import Bike from 'lucide-react-native/icons/bike';
import Beef from 'lucide-react-native/icons/beef';
import Pizza from 'lucide-react-native/icons/pizza';
import Tv from 'lucide-react-native/icons/tv';
import Shirt from 'lucide-react-native/icons/shirt';
import Fuel from 'lucide-react-native/icons/fuel';
import TreePine from 'lucide-react-native/icons/tree-pine';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import Beer from 'lucide-react-native/icons/beer';
import Box from 'lucide-react-native/icons/box';
import Bird from 'lucide-react-native/icons/bird';
import Bone from 'lucide-react-native/icons/bone';
import Bug from 'lucide-react-native/icons/bug';
import Cat from 'lucide-react-native/icons/cat';
import Fish from 'lucide-react-native/icons/fish';
import FishSymbol from 'lucide-react-native/icons/fish-symbol';
import PawPrint from 'lucide-react-native/icons/paw-print';
import Rabbit from 'lucide-react-native/icons/rabbit';
import Turtle from 'lucide-react-native/icons/turtle';
import FilePieChart from 'lucide-react-native/icons/file-chart-pie';
import FileText from 'lucide-react-native/icons/file-text';
import File from 'lucide-react-native/icons/file';
import Mail from 'lucide-react-native/icons/mail';
import Printer from 'lucide-react-native/icons/printer';
import Calendar from 'lucide-react-native/icons/calendar';
import Folder from 'lucide-react-native/icons/folder';
import Pen from 'lucide-react-native/icons/pen';
import Paintbrush from 'lucide-react-native/icons/paintbrush';
import PenTool from 'lucide-react-native/icons/pen-tool';
import Trash from 'lucide-react-native/icons/trash';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Warehouse from 'lucide-react-native/icons/warehouse';
import Bed from 'lucide-react-native/icons/bed';
import Hammer from 'lucide-react-native/icons/hammer';
import Lamp from 'lucide-react-native/icons/lamp';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Lock from 'lucide-react-native/icons/lock';
import Sofa from 'lucide-react-native/icons/sofa';
import Droplet from 'lucide-react-native/icons/droplet';
import Cake from 'lucide-react-native/icons/cake';
import CakeSlice from 'lucide-react-native/icons/cake-slice';
import PartyPopper from 'lucide-react-native/icons/party-popper';
import Balloon from 'lucide-react-native/icons/balloon';
import Drill from 'lucide-react-native/icons/drill';
import Soup from 'lucide-react-native/icons/soup';
import Cookie from 'lucide-react-native/icons/cookie';
import Sandwich from 'lucide-react-native/icons/sandwich';
import Wine from 'lucide-react-native/icons/wine';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';

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
  titleKey: TranslationKey;
  icons: IconName[];
}

export const CATEGORIZED_ICONS: IconCategory[] = [
  {
    titleKey: 'icons.catAnimals',
    icons: ['bird', 'bone', 'bug', 'cat', 'dog', 'fish', 'fish-bowl', 'paw', 'rabbit', 'turtle']
  },
  {
    titleKey: 'icons.catFiles',
    icons: ['file-pie', 'file-stack', 'file', 'mail', 'printer', 'calendar', 'folder', 'pen', 'paintbrush', 'pentool', 'trash', 'trash2']
  },
  {
    titleKey: 'icons.catHome',
    icons: ['home', 'warehouse', 'bed', 'hammer', 'lamp', 'lightbulb', 'lock', 'sofa', 'zap', 'droplet']
  },
  {
    titleKey: 'icons.catCelebration',
    icons: ['cake', 'cake-slice', 'party', 'balloon', 'tree', 'firework']
  },
  {
    titleKey: 'icons.catFood',
    icons: ['utensils-crossed', 'wine', 'soup', 'cookie', 'burger']
  },
  {
    titleKey: 'icons.catOther',
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

