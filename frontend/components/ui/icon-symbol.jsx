// Fallback for using MaterialIcons on Android and web.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
const MAPPING = {
    'house.fill': 'home',
    'paperplane.fill': 'send',
    'chevron.left.forwardslash.chevron.right': 'code',
    'chevron.right': 'chevron-right',
    'person.fill': 'person',
    'barcode.viewfinder': 'qr-code-scanner',
    'chart.bar.xaxis': 'analytics',
    'clock.arrow.circlepath': 'history',
    'safari.fill': 'explore',
};
export function IconSymbol({ name, size = 24, color, style, }) {
    return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style}/>;
}
