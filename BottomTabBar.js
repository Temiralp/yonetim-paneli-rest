import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useNavigation, useRoute, StackActions } from '@react-navigation/native';
//import Icon from 'react-native-vector-icons/Feather'; apple reject sonrası değişti altta
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKullanici } from '../context/KullaniciContext';

const { width } = Dimensions.get('window');

// Ek yükseklik değeri (piksel)
const EXTRA_HEIGHT = 1; // Bu değeri artırıp azaltarak istediğiniz yüksekliğe getirebilirsiniz

function BottomTabBar() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const currentRouteName = route.name;
    const { sepetSayisi, restaurantId } = useKullanici();
    
    // Tab elementleri için veri yapısı
    const tabs = [
        {
            name: 'Ana Sayfa',
            routeName: 'Main',
            icon: 'home'
        },
        {
            name: 'Sepet',
            routeName: 'Sepet',
            icon: 'shopping-cart'
        },
        {
            name: 'Siparişlerim',
            routeName: 'Siparislerim',
            icon: 'list'
        },
        {
            name: 'Hesap',
            routeName: 'Hesap',
            icon: 'user'
        }
    ];

    // Taba tıklandığında çalışacak fonksiyon
    const handleTabPress = (routeName) => {
        if (routeName === 'Main') {
            // [PERF FIX] Main'e dönüşte yeni instance oluşturma!
            // Stack'te Main'in pozisyonunu bul ve tam o kadar pop yap.
            const state = navigation.getState();
            if (state) {
                const mainIndex = state.routes.findIndex(r => r.name === 'Main');
                if (mainIndex >= 0 && mainIndex < state.index) {
                    // Main stack'te var ve altımızda — tam ona pop et
                    navigation.dispatch(StackActions.pop(state.index - mainIndex));
                    return;
                }
            }
            // Main stack'te yoksa veya zaten Main'deysek
            navigation.navigate(routeName, { restaurantId: restaurantId });
        } else {
            navigation.navigate(routeName, { restaurantId: restaurantId });
        }
    };

    // Platform ve cihaza göre bottom padding hesaplama
    const getBottomPadding = () => {
        // insets.bottom değeri 0 veya tanımsız ise (hatalı ise), platform bazlı sabit değer kullan
        if (!insets || insets.bottom === undefined || insets.bottom === 0) {
            // Android için daha yüksek değer kullan
            return Platform.OS === 'android' ? 15 : 0;
        }
        // insets düzgün çalışıyorsa o değeri kullan
        return insets.bottom;
    };

    return (
        <View style={[
            styles.container,
            { 
                height: 60 + EXTRA_HEIGHT + getBottomPadding(),
                paddingBottom: getBottomPadding()
            }
        ]}>
            {tabs.map((tab, index) => {
                // Aktif tab kontrolü
                const isActive = currentRouteName === tab.routeName;
                
                return (
                    <TouchableOpacity
                        key={index}
                        style={styles.tabItem}
                        onPress={() => handleTabPress(tab.routeName)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconContainer}>
                            <Feather //apple reject sonrası >> icon --> feather olaark değişti
                                name={tab.icon}
                                size={24}
                                color={isActive ? '#FF8C00' : '#757575'}
                            />
                            {/* Sepet badge'i */}
                            {tab.routeName === 'Sepet' && sepetSayisi > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {sepetSayisi > 99 ? '99+' : sepetSayisi}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text
                            style={[
                                styles.tabText,
                                isActive ? styles.activeTabText : styles.inactiveTabText
                            ]}
                        >
                            {tab.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 70, // Bu değer, üstteki height hesaplamasında değiştirilecek
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        elevation: 10, // Android gölge efekti
        shadowColor: '#000', // iOS gölge efekti
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        position: Platform.OS === 'web' ? 'fixed' : 'absolute', // Web'de fixed, native'de absolute
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999, // Diğer elementlerin üzerinde gösterilmesi için
        paddingTop: 0, // Butonları üstte tutmak için
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center', // Butonları üstte hizalamak için apple reject sonrası flext-start (center) olarak değişti
        alignItems: 'center', 
        paddingVertical:10,  //apple reject sonrası eklendi
        //paddingTop: 8, apple reject
        minHeight: 60, // Butonların yüksekliğini sabit tutmak için --> apple reject !! ilk height sonra minHeight
        minWidth:60, //Eklendi apple reject sonrası
    },
    tabText: {
        fontSize: 10,
        marginTop: 3,
    },
    activeTabText: {
        color: '#FF8C00', // Ana tema renginiz
        fontWeight: '600',
    },
    inactiveTabText: {
        color: '#757575',
    },
    iconContainer: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -12,
        backgroundColor: '#FF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: 'white',
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
});

export default BottomTabBar;