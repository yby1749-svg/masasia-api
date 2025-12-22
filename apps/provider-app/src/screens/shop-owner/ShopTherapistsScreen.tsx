import React, {useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors} from '@config/theme';
import {getImageUrl} from '@config/constants';
import {useShopOwnerStore} from '@store/shopStore';
import {Button} from '@components/ui';
import type {ShopTherapistsStackParamList} from '@types';
import type {ShopTherapist, ShopInvitation} from '@api/shops';

// KPI Bar Chart Component
function KPIBarChart({
  data,
  title,
  valueKey,
  maxValue,
  barColor,
  formatValue,
}: {
  data: ShopTherapist[];
  title: string;
  valueKey: 'completedBookings' | 'rating';
  maxValue: number;
  barColor: string;
  formatValue?: (val: number) => string;
}) {
  const sortedData = [...data].sort((a, b) => (b[valueKey] as number) - (a[valueKey] as number));

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.title}>{title}</Text>
      {sortedData.map((therapist, index) => {
        const value = therapist[valueKey] as number;
        const percentage = (value / maxValue) * 100;
        const displayValue = formatValue ? formatValue(value) : value.toString();

        return (
          <View key={therapist.id} style={chartStyles.barRow}>
            <View style={chartStyles.labelContainer}>
              <Text style={chartStyles.rank}>#{index + 1}</Text>
              <Text style={chartStyles.label} numberOfLines={1}>
                {therapist.user?.firstName || therapist.displayName}
              </Text>
            </View>
            <View style={chartStyles.barContainer}>
              <View
                style={[
                  chartStyles.bar,
                  {width: `${Math.max(percentage, 5)}%`, backgroundColor: barColor},
                ]}
              />
              <Text style={chartStyles.value}>{displayValue}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelContainer: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 24,
  },
  label: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  value: {
    position: 'absolute',
    right: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});

type NavigationProp = NativeStackNavigationProp<ShopTherapistsStackParamList>;

export function ShopTherapistsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    therapists,
    invitations,
    isLoading,
    fetchTherapists,
    fetchInvitations,
    removeTherapist,
    cancelInvitation,
  } = useShopOwnerStore();

  const [activeTab, setActiveTab] = useState<'therapists' | 'kpi' | 'invitations'>('therapists');
  const [kpiPeriod, setKpiPeriod] = useState<'weekly' | 'monthly'>('weekly');

  // Simulated weekly/monthly data based on therapist performance
  // In production, this would come from actual booking data with date filters
  const getPerformanceData = useMemo(() => {
    return therapists.map(t => {
      // Simulate weekly as ~25% of total, monthly as total
      const weeklyMultiplier = 0.25;
      const monthlyMultiplier = 1.0;
      const multiplier = kpiPeriod === 'weekly' ? weeklyMultiplier : monthlyMultiplier;

      return {
        ...t,
        periodBookings: Math.round(t.completedBookings * multiplier),
        periodEarnings: Math.round(t.completedBookings * multiplier * 900), // Avg ₱900 per booking
      };
    });
  }, [therapists, kpiPeriod]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    if (therapists.length === 0) return null;
    const data = getPerformanceData;
    const maxBookings = Math.max(...data.map(t => t.periodBookings), 1);
    const maxEarnings = Math.max(...data.map(t => t.periodEarnings), 1);
    const totalBookings = data.reduce((sum, t) => sum + t.periodBookings, 0);
    const totalEarnings = data.reduce((sum, t) => sum + t.periodEarnings, 0);
    const avgRating = therapists.reduce((sum, t) => sum + t.rating, 0) / therapists.length;
    const onlineCount = therapists.filter(t => t.onlineStatus === 'ONLINE').length;
    return {maxBookings, maxEarnings, totalBookings, totalEarnings, avgRating, onlineCount};
  }, [therapists, getPerformanceData]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchTherapists(), fetchInvitations()]);
  };

  const handleRemoveTherapist = (therapist: ShopTherapist) => {
    Alert.alert(
      'Remove Therapist',
      `Are you sure you want to remove ${therapist.user?.firstName} ${therapist.user?.lastName} from your shop?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTherapist(therapist.id);
            } catch {
              Alert.alert('Error', 'Failed to remove therapist');
            }
          },
        },
      ],
    );
  };

  const handleCancelInvitation = (invitation: ShopInvitation) => {
    Alert.alert(
      'Cancel Invitation',
      'Are you sure you want to cancel this invitation?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvitation(invitation.id);
            } catch {
              Alert.alert('Error', 'Failed to cancel invitation');
            }
          },
        },
      ],
    );
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING');

  const renderTherapist = ({item}: {item: ShopTherapist}) => (
    <View style={styles.itemCard}>
      {item.user?.avatarUrl ? (
        <Image
          source={{uri: getImageUrl(item.user.avatarUrl)}}
          style={styles.avatarImage}
        />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.user?.firstName?.charAt(0) || 'T'}
          </Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>
          {item.user?.firstName} {item.user?.lastName}
        </Text>
        <Text style={styles.itemSubtitle}>{item.displayName}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>⭐ {item.rating.toFixed(1)}</Text>
          <Text style={styles.stat}>📋 {item.completedBookings} jobs</Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <View
          style={[
            styles.statusBadge,
            item.onlineStatus === 'ONLINE' && styles.onlineBadge,
          ]}>
          <Text
            style={[
              styles.statusText,
              item.onlineStatus === 'ONLINE' && styles.onlineText,
            ]}>
            {item.onlineStatus}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveTherapist(item)}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInvitation = ({item}: {item: ShopInvitation}) => (
    <View style={styles.itemCard}>
      <View style={[styles.avatar, styles.avatarPending]}>
        <Text style={styles.avatarText}>📧</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>
          {item.targetProvider
            ? `${item.targetProvider.user?.firstName} ${item.targetProvider.user?.lastName}`
            : item.targetEmail || 'Unknown'}
        </Text>
        <Text style={styles.itemSubtitle}>
          Code: {item.inviteCode}
        </Text>
        <Text style={styles.expiryText}>
          Expires: {new Date(item.expiresAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <View style={[styles.statusBadge, styles.pendingBadge]}>
          <Text style={styles.pendingText}>{item.status}</Text>
        </View>
        {item.status === 'PENDING' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelInvitation(item)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'therapists' && styles.activeTab]}
          onPress={() => setActiveTab('therapists')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'therapists' && styles.activeTabText,
            ]}>
            Therapists ({therapists.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'kpi' && styles.activeTab]}
          onPress={() => setActiveTab('kpi')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'kpi' && styles.activeTabText,
            ]}>
            📊 KPI
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invitations' && styles.activeTab]}
          onPress={() => setActiveTab('invitations')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'invitations' && styles.activeTabText,
            ]}>
            Invitations ({pendingInvitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'therapists' ? (
        <FlatList
          data={therapists}
          renderItem={renderTherapist}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadData} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Therapists Yet</Text>
              <Text style={styles.emptyText}>
                Invite therapists to join your shop
              </Text>
            </View>
          }
        />
      ) : activeTab === 'kpi' ? (
        <ScrollView
          style={styles.kpiContainer}
          contentContainerStyle={styles.kpiContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadData} />
          }>
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                kpiPeriod === 'weekly' && styles.periodButtonActive,
              ]}
              onPress={() => setKpiPeriod('weekly')}>
              <Text
                style={[
                  styles.periodButtonText,
                  kpiPeriod === 'weekly' && styles.periodButtonTextActive,
                ]}>
                📅 This Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                kpiPeriod === 'monthly' && styles.periodButtonActive,
              ]}
              onPress={() => setKpiPeriod('monthly')}>
              <Text
                style={[
                  styles.periodButtonText,
                  kpiPeriod === 'monthly' && styles.periodButtonTextActive,
                ]}>
                📆 This Month
              </Text>
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          {kpiMetrics && (
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{kpiMetrics.totalBookings}</Text>
                <Text style={styles.summaryLabel}>
                  {kpiPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Bookings
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  ₱{kpiMetrics.totalEarnings.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>
                  {kpiPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Revenue
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{kpiMetrics.onlineCount}</Text>
                <Text style={styles.summaryLabel}>Online Now</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{kpiMetrics.avgRating.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>Avg Rating</Text>
              </View>
            </View>
          )}

          {/* Bookings Bar Chart */}
          {getPerformanceData.length > 0 && kpiMetrics && (
            <>
              <View style={chartStyles.container}>
                <Text style={chartStyles.title}>
                  📋 {kpiPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Bookings
                </Text>
                {[...getPerformanceData]
                  .sort((a, b) => b.periodBookings - a.periodBookings)
                  .map((therapist, index) => {
                    const percentage = (therapist.periodBookings / kpiMetrics.maxBookings) * 100;
                    return (
                      <View key={therapist.id} style={chartStyles.barRow}>
                        <View style={chartStyles.labelContainer}>
                          <Text style={chartStyles.rank}>#{index + 1}</Text>
                          <Text style={chartStyles.label} numberOfLines={1}>
                            {therapist.user?.firstName || therapist.displayName}
                          </Text>
                        </View>
                        <View style={chartStyles.barContainer}>
                          <View
                            style={[
                              chartStyles.bar,
                              {width: `${Math.max(percentage, 5)}%`, backgroundColor: colors.primary},
                            ]}
                          />
                          <Text style={chartStyles.value}>{therapist.periodBookings}</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>

              <View style={chartStyles.container}>
                <Text style={chartStyles.title}>
                  💰 {kpiPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Earnings
                </Text>
                {[...getPerformanceData]
                  .sort((a, b) => b.periodEarnings - a.periodEarnings)
                  .map((therapist, index) => {
                    const percentage = (therapist.periodEarnings / kpiMetrics.maxEarnings) * 100;
                    return (
                      <View key={therapist.id} style={chartStyles.barRow}>
                        <View style={chartStyles.labelContainer}>
                          <Text style={chartStyles.rank}>#{index + 1}</Text>
                          <Text style={chartStyles.label} numberOfLines={1}>
                            {therapist.user?.firstName || therapist.displayName}
                          </Text>
                        </View>
                        <View style={chartStyles.barContainer}>
                          <View
                            style={[
                              chartStyles.bar,
                              {width: `${Math.max(percentage, 5)}%`, backgroundColor: colors.success},
                            ]}
                          />
                          <Text style={chartStyles.value}>₱{therapist.periodEarnings.toLocaleString()}</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>

              <View style={chartStyles.container}>
                <Text style={chartStyles.title}>⭐ Customer Rating</Text>
                {[...therapists]
                  .sort((a, b) => b.rating - a.rating)
                  .map((therapist, index) => {
                    const percentage = (therapist.rating / 5) * 100;
                    return (
                      <View key={therapist.id} style={chartStyles.barRow}>
                        <View style={chartStyles.labelContainer}>
                          <Text style={chartStyles.rank}>#{index + 1}</Text>
                          <Text style={chartStyles.label} numberOfLines={1}>
                            {therapist.user?.firstName || therapist.displayName}
                          </Text>
                        </View>
                        <View style={chartStyles.barContainer}>
                          <View
                            style={[
                              chartStyles.bar,
                              {width: `${Math.max(percentage, 5)}%`, backgroundColor: colors.warning},
                            ]}
                          />
                          <Text style={chartStyles.value}>{therapist.rating.toFixed(1)}</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </>
          )}

          {therapists.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No KPI Data</Text>
              <Text style={styles.emptyText}>
                Add therapists to see performance metrics
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadData} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📧</Text>
              <Text style={styles.emptyTitle}>No Invitations</Text>
              <Text style={styles.emptyText}>
                Send invitations to therapists
              </Text>
            </View>
          }
        />
      )}

      {/* Invite Button */}
      <View style={styles.footer}>
        <Button
          title="Invite Therapist"
          onPress={() => navigation.navigate('SendInvitation')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPending: {
    backgroundColor: colors.warning + '20',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  stat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  expiryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  onlineBadge: {
    backgroundColor: colors.success + '20',
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  onlineText: {
    color: colors.success,
  },
  pendingText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  removeText: {
    fontSize: 12,
    color: colors.error,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 12,
    color: colors.error,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // KPI styles
  kpiContainer: {
    flex: 1,
  },
  kpiContent: {
    padding: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  // Period selector styles
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.textInverse,
  },
});
