import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HowToEarnPointsModal from './HowToEarnPointsModal';

const LoyaltyProgressCard = ({ data, themeColor = '#FF6B00', predictedData = null, onHowToEarnPress }) => {
    const [infoModalVisible, setInfoModalVisible] = useState(false);

    if (!data || !data.milestones || data.milestones.length === 0) return null;

    const { totalXp, milestones } = data;

    // Ödülleri xp_target'a göre sıralayalım
    const sortedMilestones = [...milestones].sort((a, b) => a.xp_target - b.xp_target);

    const milestoneCount = sortedMilestones.length;

    // Potansiyel XP (sepetteki ürünlerle birlikte)
    const additionalXp = predictedData?.additionalXp || 0;
    const predictedXp = predictedData?.predictedXp || totalXp;
    const willReachMilestone = predictedData?.willReachMilestone || false;
    const reachedMilestone = predictedData?.reachedMilestone || null;

    // Her milestone'ın dinamik ScrollView içeriğindeki bar üzerindeki pozisyonu (%)
    const getMilestonePercent = (index) => {
        if (milestoneCount <= 1) return 50;
        // İlk milestone %5, son milestone %95
        return 5 + (index / (milestoneCount - 1)) * 90;
    };

    // ScrollView genişliği dinamik hesaplanır: her ödül için 110 piksel alan ayır.
    const screenWidth = Dimensions.get('window').width - 40;
    const scrollWidth = Math.max(screenWidth, milestoneCount * 110);

    // Mevcut XP'nin bar üzerindeki pozisyonu
    const getXpPercent = (xp) => {
        if (milestoneCount === 0) return 0;
        if (xp <= sortedMilestones[0].xp_target) {
            const ratio = xp / sortedMilestones[0].xp_target;
            const visualRatio = Math.pow(ratio, 0.7); // Gamification boost
            return visualRatio * getMilestonePercent(0);
        }
        if (xp >= sortedMilestones[milestoneCount - 1].xp_target) {
            return getMilestonePercent(milestoneCount - 1);
        }
        
        // İkon yarıçapı 20px. Yüzdelik karşılığı:
        const radiusPct = (20 / scrollWidth) * 100;

        // İki milestone arasında interpolasyon
        for (let i = 0; i < milestoneCount - 1; i++) {
            const curr = sortedMilestones[i];
            const next = sortedMilestones[i + 1];
            if (xp >= curr.xp_target && xp < next.xp_target) {
                const ratio = (xp - curr.xp_target) / (next.xp_target - curr.xp_target);
                
                // Oyunlaştırma (Gamification) Hilesi:
                // Kullanıcı %12 ilerlese bile görsel olarak çubuk daha dolu görünsün diye
                // eğrisel bir boost uyguluyoruz (örn: 0.12 -> 0.28)
                const visualRatio = Math.pow(ratio, 0.6);
                
                const pctA = getMilestonePercent(i);
                const pctB = getMilestonePercent(i + 1);
                
                if (ratio === 0) return pctA;

                const visibleStart = pctA + radiusPct;
                const visibleEnd = pctB - radiusPct;
                const visibleWidth = visibleEnd - visibleStart;

                if (visibleWidth <= 0) {
                    return pctA + visualRatio * (pctB - pctA);
                }

                return visibleStart + (visualRatio * visibleWidth);
            }
        }
        return 0;
    };

    const currentPercent = getXpPercent(totalXp);
    const predictedPercent = getXpPercent(predictedXp);

    // Bir sonraki hedefi bul (mevcut XP'ye göre)
    const nextGoal = sortedMilestones.find(m => m.xp_target > totalXp);


    const pulseAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        if (additionalXp > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1200,
                        useNativeDriver: false,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0.4,
                        duration: 1200,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(0.4);
        }
    }, [additionalXp]);

    const getIconForMilestone = (name, achieved) => {
        const color = achieved ? themeColor : '#D1D1D1';
        const lowerName = (name || '').toLowerCase();

        if (lowerName.includes('indirim') || lowerName.includes('%')) {
            return <MaterialCommunityIcons name="percent" size={18} color={color} />;
        }
        if (lowerName.includes('içecek') || lowerName.includes('kahve') || lowerName.includes('cola')) {
            return <MaterialCommunityIcons name="coffee-outline" size={18} color={color} />;
        }
        if (lowerName.includes('tatlı') || lowerName.includes('donut') || lowerName.includes('pasta')) {
            return <MaterialCommunityIcons name="ice-cream" size={18} color={color} />;
        }
        return <MaterialCommunityIcons name="gift-outline" size={18} color={color} />;
    };

    return (
        <View style={styles.container}>
            {/* Nasıl Puan Kazanırım Link */}
            <TouchableOpacity 
                style={styles.howToEarn} 
                onPress={() => {
                    if (onHowToEarnPress) onHowToEarnPress();
                    setInfoModalVisible(true);
                }} 
                activeOpacity={0.7}
            >
                <Text style={styles.howToEarnText}>Nasıl Puan Kazanırım?</Text>
                <MaterialCommunityIcons name="help-circle-outline" size={14} color="#9E9E9E" />
            </TouchableOpacity>

            <View style={styles.card}>
                {/* Header: Logo, Points and Arrow */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        {/* Theme Color Logo Box */}
                        <View style={[styles.logoBox, { backgroundColor: themeColor }]}>
                            <MaterialCommunityIcons name="star-four-points" size={22} color="white" />
                        </View>

                        <View style={styles.pointsColumn}>
                            <View style={styles.pointsRow}>
                                <Text style={styles.currentPoints}>{totalXp}</Text>
                                {additionalXp > 0 && (
                                    <View style={[styles.bonusBadge, { backgroundColor: '#4CAF50' }]}>
                                        <Text style={styles.bonusText}>+{additionalXp} PUAN</Text>
                                    </View>
                                )}
                            </View>

                            {/* Target Description */}
                            {willReachMilestone && reachedMilestone ? (
                                <Text style={styles.infoText}>
                                    <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Bu siparişle {reachedMilestone.name}</Text> kazanıyorsun!
                                </Text>
                            ) : nextGoal ? (
                                <Text style={styles.infoText}>
                                    <Text style={{ color: themeColor, fontWeight: 'bold' }}>{nextGoal.name}</Text> hedefine {nextGoal.xp_target - totalXp} puan kaldı!
                                </Text>
                            ) : null}
                        </View>
                    </View>

                </View>

                {/* Timeline Area (Visual Progress) — Scrollable */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.timelineWrapper}
                    contentContainerStyle={{ width: scrollWidth }}
                >
                    {/* Background Line */}
                    <View style={styles.barBackground}>
                        {/* Active Progress Line */}
                        <View style={[
                            styles.barActive,
                            {
                                width: `${currentPercent}%`,
                                backgroundColor: themeColor
                            }
                        ]} />

                        {/* Predicted Progress Line */}
                        {additionalXp > 0 && (
                            <Animated.View
                                style={[
                                    styles.barPredicted,
                                    {
                                        left: `${currentPercent}%`,
                                        width: `${Math.max(predictedPercent - currentPercent, 0)}%`,
                                        opacity: pulseAnim,
                                    }
                                ]}
                            />
                        )}
                    </View>

                    {/* Milestones */}
                    <View style={styles.milestonesContainer}>
                        {sortedMilestones.map((m, index) => {
                            const isAchieved = totalXp >= m.xp_target;
                            const willBeAchieved = predictedXp >= m.xp_target && !isAchieved;
                            const positionPercent = getMilestonePercent(index);

                            return (
                                <View key={m.id || `milestone_${index}`} style={[
                                    styles.milestoneItem,
                                    { position: 'absolute', left: `${positionPercent}%`, transform: [{ translateX: -22 }] }
                                ]}>
                                    <View style={[
                                        styles.iconCircle,
                                        isAchieved && { borderColor: themeColor },
                                        willBeAchieved && styles.iconCirclePredicted,
                                        !isAchieved && !willBeAchieved && styles.iconCircleFuture
                                    ]}>
                                        {getIconForMilestone(m.name, isAchieved || willBeAchieved)}

                                        {isAchieved && (
                                            <View style={styles.completedCheck}>
                                                <MaterialCommunityIcons name="check" size={10} color="white" />
                                            </View>
                                        )}

                                        {willBeAchieved && (
                                            <View style={styles.predictedCheck}>
                                                <MaterialCommunityIcons name="star" size={8} color="white" />
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.xpText, isAchieved && styles.textActive]}>{m.xp_target}</Text>
                                        <Text style={[styles.rewardNameText, isAchieved && styles.textActive]} numberOfLines={2}>
                                            {m.name}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            {/* Nasıl Puan Kazanırım Modal (Extracted to maintain SRP) */}
            <HowToEarnPointsModal 
                visible={infoModalVisible} 
                onClose={() => setInfoModalVisible(false)} 
                themeColor={themeColor} 
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 12,
        marginVertical: 12,
    },
    howToEarn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    howToEarnText: {
        fontSize: 12,
        color: '#9E9E9E',
        marginRight: 4,
        fontWeight: '500'
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        paddingTop: 20,
        paddingHorizontal: 16,
        paddingBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    logoBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    pointsColumn: {
        flex: 1,
        justifyContent: 'center'
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2
    },
    currentPoints: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1a1a1a',
        marginRight: 8,
        letterSpacing: -1
    },
    bonusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8
    },
    bonusText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '900'
    },
    infoText: {
        fontSize: 13,
        color: '#777',
        fontWeight: '500'
    },
    timelineWrapper: {
        width: '100%',
        marginTop: 20,
        height: 110,
    },
    barBackground: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: 6,
        backgroundColor: '#F2F2F2',
        borderRadius: 3,
        top: 19,
    },
    barActive: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: 6,
        borderRadius: 3,
        zIndex: 1
    },
    barPredicted: {
        position: 'absolute',
        height: 6,
        backgroundColor: '#FFB74D',
        borderRadius: 3,
        top: 0,
        zIndex: 1,
    },
    milestonesContainer: {
        position: 'relative',
        width: '100%',
        height: 80,
        zIndex: 2,
    },
    milestoneItem: {
        alignItems: 'center',
        width: 44,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    iconCirclePredicted: {
        borderColor: '#FFB74D',
        borderStyle: 'dashed',
    },
    iconCircleFuture: {
        borderColor: '#F2F2F2',
    },
    completedCheck: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white'
    },
    predictedCheck: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FFB74D',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white'
    },
    labelContainer: {
        alignItems: 'center',
        width: 80,
    },
    xpText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#999',
    },
    rewardNameText: {
        fontSize: 10,
        color: '#AAA',
        textAlign: 'center',
        marginTop: 2,
        fontWeight: '600'
    },
    textActive: {
        color: '#333'
    }
});

export default LoyaltyProgressCard;
