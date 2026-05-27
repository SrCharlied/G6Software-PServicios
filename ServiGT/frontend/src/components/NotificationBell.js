import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUnreadNotificationsCount } from '../services/api';
import { T } from '../theme';

export default function NotificationBell({ onPress }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCount = async () => {
      try {
        const count = await getUnreadNotificationsCount();
        if (mounted) setUnreadCount(count);
      } catch {
        if (mounted) setUnreadCount(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCount();

    return () => { mounted = false; };
  }, []);

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.bellIcon}>
        <View style={styles.bellBody} />
        <View style={styles.bellBase} />
        <View style={styles.bellClapper} />
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={T.blue} />
        </View>
      ) : unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    width: 18,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bellBody: {
    width: 16,
    height: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderColor: T.ink,
    borderBottomWidth: 0,
  },
  bellBase: {
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: T.ink,
  },
  bellClapper: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.ink,
    marginTop: 1,
  },
  loader: {
    position: 'absolute',
    top: -2,
    right: -2,
    transform: [{ scale: 0.55 }],
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: T.danger,
    borderWidth: 1,
    borderColor: T.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
