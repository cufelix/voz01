import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { userService } from '../../services/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { User, MainTabParamList } from '@shared/types';
import { formatCzechPhoneNumber } from '@shared/utils';

type ProfileScreenNavigationProp = StackNavigationProp<MainTabParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRentals: 0,
    totalSpent: 0,
    memberSince: '',
  });

  useEffect(() => {
    if (user) {
      loadUserData();
      loadUserStats();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const data = await userService.getUser(user.uid);
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;

    try {
      const reservations = await userService.getUserReservations(user.uid);
      const completedRentals = reservations.filter(r =>
        r.status === 'completed'
      );
      const totalSpent = completedRentals.reduce((sum, r) => sum + r.totalPrice, 0);

      setStats({
        totalRentals: completedRentals.length,
        totalSpent,
        memberSince: userData?.createdAt
          ? userData.createdAt.toLocaleDateString('cs-CZ')
          : new Date().toLocaleDateString('cs-CZ'),
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleEditProfile = () => {
    Alert.alert('Úprava profilu', 'Funkce úpravy profilu bude brzy dostupná.');
  };

  const handleLogout = () => {
    Alert.alert(
      'Odhlášení',
      'Opravdu se chcete odhlásit?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odhlásit',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Chyba', 'Nepodařilo se odhlásit');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Smazání účtu',
      'Tato akce je nevratná. Veškerá data budou trvale smazána. Chcete pokračovat?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat účet',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Potvrzení smazání',
              'Pro smazání účtu kontaktujte prosím naši podporu na podpora@pripoj.to',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Kontakt na podporu',
      'Tel: +420 123 456 789\nEmail: podpora@pripoj.to\n\nOtevírací doba: Po-Pá 8:00-18:00',
      [
        { text: 'Zavřít', style: 'cancel' },
        { text: 'Volat', onPress: () => Linking.openURL('tel:+420123456789') },
        { text: 'Email', onPress: () => Linking.openURL('mailto:podpora@pripoj.to') },
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Ohodnoťte aplikaci',
      'Děkujeme, že používáte Pripoj.to! Vaše hodnocení nám pomůže zlepšit služby.',
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Ohodnotit', onPress: () => {
          // Open app store for rating
          Linking.openURL('https://play.google.com/store/apps/details?id=com.pripojto');
        }},
      ]
    );
  };

  const handleTerms = () => {
    Linking.openURL('https://pripoj.to/terms');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://pripoj.to/privacy');
  };

  const menuItems = [
    {
      id: 'edit',
      title: 'Upravit profil',
      icon: 'edit',
      onPress: handleEditProfile,
      color: '#3b82f6',
    },
    {
      id: 'history',
      title: 'Historie výpůjček',
      icon: 'history',
      onPress: () => navigation.navigate('History'),
      color: '#3b82f6',
    },
    {
      id: 'support',
      title: 'Kontaktovat podporu',
      icon: 'support-agent',
      onPress: handleContactSupport,
      color: '#3b82f6',
    },
    {
      id: 'rate',
      title: 'Ohodnotit aplikaci',
      icon: 'star',
      onPress: handleRateApp,
      color: '#3b82f6',
    },
    {
      id: 'terms',
      title: 'Obchodní podmínky',
      icon: 'description',
      onPress: handleTerms,
      color: '#6b7280',
    },
    {
      id: 'privacy',
      title: 'Zásady ochrany osobních údajů',
      icon: 'security',
      onPress: handlePrivacy,
      color: '#6b7280',
    },
    {
      id: 'logout',
      title: 'Odhlásit se',
      icon: 'logout',
      onPress: handleLogout,
      color: '#ef4444',
    },
    {
      id: 'delete',
      title: 'Smazat účet',
      icon: 'delete',
      onPress: handleDeleteAccount,
      color: '#ef4444',
    },
  ];

  if (!user || !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData.firstName.charAt(0)}{userData.lastName.charAt(0)}
            </Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: userData.isActive ? '#22c55e' : '#ef4444' }]} />
        </View>
        <Text style={styles.userName}>
          {userData.firstName} {userData.lastName}
        </Text>
        <Text style={styles.userPhone}>
          {formatCzechPhoneNumber(userData.phone)}
        </Text>
        <Text style={styles.userEmail}>{userData.email}</Text>

        <View style={styles.memberBadge}>
          <Icon name="verified-user" size={16} color="#3b82f6" />
          <Text style={styles.memberText}>Člen od {stats.memberSince}</Text>
        </View>
      </View>

      {/* Address */}
      {userData.address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fakturační adresa</Text>
          <View style={styles.addressContainer}>
            <Icon name="location-on" size={20} color="#6b7280" />
            <View style={styles.addressContent}>
              <Text style={styles.addressStreet}>{userData.address.street}</Text>
              <Text style={styles.addressCity}>
                {userData.address.postalCode} {userData.address.city}
              </Text>
              {userData.ico && (
                <Text style={styles.addressIco}>IČO: {userData.ico}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moje statistiky</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalRentals}</Text>
            <Text style={styles.statLabel}>Pronájmů</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCzk(stats.totalSpent)}</Text>
            <Text style={styles.statLabel}>Celkem utraceno</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rychlé akce</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('History')}
          >
            <Icon name="history" size={24} color="#3b82f6" />
            <Text style={styles.quickActionText}>Historie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={handleEditProfile}>
            <Icon name="edit" size={24} color="#3b82f6" />
            <Text style={styles.quickActionText}>Upravit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={handleContactSupport}>
            <Icon name="support-agent" size={24} color="#3b82f6" />
            <Text style={styles.quickActionText}>Podpora</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Icon name={item.icon} size={20} color={item.color} />
                <Text style={[styles.menuItemText, { color: item.color }]}>
                  {item.title}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>Pripoj.to v1.0.0</Text>
        <Text style={styles.copyrightText}>© 2024 Pripoj.to</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  memberText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    marginLeft: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressContent: {
    marginLeft: 12,
    flex: 1,
  },
  addressStreet: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 2,
  },
  addressCity: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  addressIco: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
  },
  quickActionText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  menuContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    color: '#d1d5db',
  },
});

export default ProfileScreen;