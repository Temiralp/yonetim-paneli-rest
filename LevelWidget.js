import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const LevelWidget = ({ data, themeColor = '#FF6B00' }) => {
    if (!data) return null;

    const { currentLevel, title, totalXp, activeRate, nextLevel, currentLevelThreshold } = data;

    // İlerleme yüzdesini hesapla (seviye içi ilerleme)
    let progress = 0;
    if (nextLevel && nextLevel.xp_threshold) {
        // Mevcut seviye eşiği ve sonraki seviye eşiği arasındaki ilerleme
        const levelStart = currentLevelThreshold || 0;
        const levelEnd = nextLevel.xp_threshold;
        const levelRange = levelEnd - levelStart;
        if (levelRange > 0) {
            progress = Math.min(Math.max((totalXp - levelStart) / levelRange, 0), 1);
        }
    } else {
        progress = 1; // Max seviye
    }

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={[styles.badge, { backgroundColor: themeColor }]}>
                    <Text style={styles.badgeText}>{currentLevel}</Text>
                </View>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>Sadakat Seviyesi</Text>
                </View>
                <View style={styles.rateBatch}>
                    <Text style={styles.rateLabel}>Kazanç</Text>
                    <Text style={[styles.rateValue, { color: themeColor }]}>%{activeRate}</Text>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressBarBg}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${progress * 100}%`, backgroundColor: themeColor }
                        ]}
                    />
                </View>
                <View style={styles.progressLabels}>
                    <Text style={styles.xpText}>{totalXp} XP</Text>
                    {nextLevel && (
                        <Text style={styles.nextText}>Sonraki: {nextLevel.title}</Text>
                    )}
                </View>
            </View>

            <Text style={styles.infoText}>
                Sipariş verdikçe XP kazanın, seviye atlayın ve cüzdan kazancınızı artırın!
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginVertical: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    badge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900'
    },
    titleContainer: {
        flex: 1
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D2D2D'
    },
    subtitle: {
        fontSize: 12,
        color: '#7C7C7C',
        marginTop: 2
    },
    rateBatch: {
        alignItems: 'flex-end',
        backgroundColor: '#FDF2E9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12
    },
    rateLabel: {
        fontSize: 10,
        color: '#7C7C7C',
        textTransform: 'uppercase'
    },
    rateValue: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    progressSection: {
        marginBottom: 10
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    xpText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2D2D2D'
    },
    nextText: {
        fontSize: 11,
        color: '#7C7C7C'
    },
    infoText: {
        fontSize: 11,
        color: '#9E9E9E',
        fontStyle: 'italic',
        marginTop: 4,
        textAlign: 'center'
    }
});

export default LevelWidget;
