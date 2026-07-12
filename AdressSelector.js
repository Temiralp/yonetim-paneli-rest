import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Platform,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../src/config/api';
import { safeFetch } from '../src/utils/networkHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useGeolocation from '../hooks/useGeolocation';
import Toast from 'react-native-toast-message';
/* ─── Outline etiketli Picker kutusu ─────────────────────────────────── */
function OutlinedPicker({ label, selectedValue, onValueChange, items, placeholder, loading, enabled = true }) {
    const hasValue = !!selectedValue;
    return (
        <View style={pickerStyles.wrapper}>
            <Text style={[pickerStyles.floatLabel, hasValue && pickerStyles.floatLabelFilled]}>
                {label}
            </Text>
            <View style={[pickerStyles.box, !enabled && pickerStyles.boxDisabled]}>
                {Platform.OS === 'android' ? (
                    <>
                        <Text style={[pickerStyles.valueText, !hasValue && pickerStyles.placeholder]}>
                            {loading ? 'Yükleniyor...' : (selectedValue || placeholder)}
                        </Text>
                        <Text style={pickerStyles.chevron}>▾</Text>
                        <Picker
                            selectedValue={selectedValue}
                            onValueChange={onValueChange}
                            enabled={enabled && !loading}
                            style={pickerStyles.androidOverlay}
                        >
                            <Picker.Item label={loading ? 'Yükleniyor...' : placeholder} value="" />
                            {items.map(item => (
                                <Picker.Item key={item.id} label={item.name} value={item.name} />
                            ))}
                        </Picker>
                    </>
                ) : (
                    <Picker
                        selectedValue={selectedValue}
                        onValueChange={onValueChange}
                        enabled={enabled && !loading}
                        style={pickerStyles.iosPicker}
                    >
                        <Picker.Item label={loading ? 'Yükleniyor...' : placeholder} value="" />
                        {items.map(item => (
                            <Picker.Item key={item.id} label={item.name} value={item.name} />
                        ))}
                    </Picker>
                )}
            </View>
        </View>
    );
}

/* ─── Outline etiketli TextInput kutusu ──────────────────────────────── */
function OutlinedInput({ label, value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, style }) {
    return (
        <View style={[inputStyles.wrapper, style]}>
            {!!label && (
                <Text style={[inputStyles.floatLabel, !!value && inputStyles.floatLabelFilled]}>
                    {label}
                </Text>
            )}
            <TextInput
                style={[inputStyles.box, multiline && inputStyles.multilineBox]}
                placeholder={value ? '' : placeholder}
                placeholderTextColor="#bbb"
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType || 'default'}
                multiline={multiline}
                numberOfLines={numberOfLines}
                textAlignVertical={multiline ? 'top' : 'center'}
                autoCapitalize="sentences"
            />
        </View>
    );
}

/* ─── Ana Bileşen ────────────────────────────────────────────────────── */
function AdresSelector({ adresBilgileri, onAdresChange, children, onOpenMap, mapLocation }) {
    const [loadingCities, setLoadingCities] = useState(true);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

    const [cities, setCities] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);

    const [selectedCity, setSelectedCity] = useState(adresBilgileri?.city || '');
    const [selectedDistrict, setSelectedDistrict] = useState(adresBilgileri?.district || '');
    const [selectedNeighborhood, setSelectedNeighborhood] = useState(adresBilgileri?.neighborhood || '');
    const [street, setStreet] = useState('');
    const [binaNo, setBinaNo] = useState('');
    const [adresTarifi, setAdresTarifi] = useState(adresBilgileri?.address_detail || '');
    const [isDefault, setIsDefault] = useState(adresBilgileri?.is_default === 1 || false);

    const [latitude, setLatitude] = useState(adresBilgileri?.latitude || null);
    const [longitude, setLongitude] = useState(adresBilgileri?.longitude || null);

    const { location, errorMsg, isLocationFetching, getLocation } = useGeolocation();

    const initRef = React.useRef(false);

    /* ── API yardımcısı ── */
    const fetchLocation = async (endpoint) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const rId = await AsyncStorage.getItem('restaurant_id');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };
            if (rId) headers['x-restaurant-id'] = rId;

            const res = await safeFetch(`${API_URL}${endpoint}`, { headers });
            const json = await res.json();
            return json.status === 'success' ? json.data : [];
        } catch {
            return [];
        }
    };

    /* ── Şehirleri yükle ── */
    useEffect(() => {
        (async () => {
            setLoadingCities(true);
            const data = await fetchLocation('/api/locations/regions');
            setCities(data);
            setLoadingCities(false);

            // Veriler yüklendikten sonra:
            // Eğer şehir seçili değilse (yeni adres modu)
            if (!selectedCity && data.length > 0) {
                // 1. "İSTANBUL (AVRUPA)" var mı kontrol et
                const istanbulAvrupa = data.find(c => c.name.includes("İSTANBUL (AVRUPA)") || c.name.includes("ISTANBUL (AVRUPA)"));
                if (istanbulAvrupa) {
                    handleCityChange(istanbulAvrupa.name, data);
                }
                // 2. Yoksa ve tek bir şehir varsa onu seç
                else if (data.length === 1) {
                    handleCityChange(data[0].name, data);
                }
            }
        })();
    }, []);

    /* ── Edit modu: zincirleme yükle ── */
    useEffect(() => {
        if (initRef.current || cities.length === 0 || !adresBilgileri?.city) return;
        initRef.current = true;

        (async () => {
            const cityObj = cities.find(c => c.name === adresBilgileri.city);
            if (!cityObj) return;
            const dist = await fetchLocation(`/api/locations/regions/${cityObj.id}/districts`);
            setDistricts(dist);

            const distObj = dist.find(d => d.name === adresBilgileri.district);
            if (!distObj) return;
            const hoods = await fetchLocation(`/api/locations/districts/${distObj.id}/neighborhoods`);
            setNeighborhoods(hoods);

            // Bina no ayıklama (street alanından " No: X" formatını bul)
            let originalStreet = adresBilgileri.street || '';
            let extractedBinaNo = '';
            const noMatch = originalStreet.match(/ No:\s*(\S+.*)$/i);
            if (noMatch) {
                extractedBinaNo = noMatch[1];
                originalStreet = originalStreet.replace(noMatch[0], '');
            }
            // Çift "No:" temizliği
            originalStreet = originalStreet.replace(/\s*,?\s*No:?\s*$/i, '').trim();
            if (extractedBinaNo) {
                extractedBinaNo = extractedBinaNo.replace(/^(no[:\s]*)+/i, '').trim();
            }

            setSelectedCity(adresBilgileri.city);
            setSelectedDistrict(adresBilgileri.district);
            setSelectedNeighborhood(adresBilgileri.neighborhood || '');
            setStreet(originalStreet);
            setBinaNo(extractedBinaNo);
            setAdresTarifi(adresBilgileri.address_detail || '');
            setIsDefault(adresBilgileri.is_default === 1);
            setLatitude(adresBilgileri.latitude || null);
            setLongitude(adresBilgileri.longitude || null);
        })();
    }, [adresBilgileri, cities]);

    /* ── Konumdan Doldurma ── */
    const fillFormFromLocation = async (lat, lng) => {
        console.log(`[DEBUG-GEOCODE] fillFormFromLocation tetiklendi! Lat: ${lat}, Lng: ${lng}`);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const rId = await AsyncStorage.getItem('restaurant_id');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };
            if (rId) headers['x-restaurant-id'] = rId;

            console.log(`[DEBUG-GEOCODE] ${API_URL}/api/geocode/reverse adresine istek atılıyor...`);
            const res = await safeFetch(`${API_URL}/api/geocode/reverse`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });
            const json = await res.json();

            console.log(`[DEBUG-GEOCODE] Reverse Geocode yanıtı: ${JSON.stringify(json)}`);

            if (json.status === 'success') {
                const data = json.data;
                console.log(`[DEBUG-GEOCODE] Başarılı çözümleme! İl: ${data.city}, İlçe: ${data.district}, Mahalle: ${data.neighborhood}`);

                if (data.is_in_delivery_zone === false) {
                    Toast.show({
                        type: 'error',
                        text1: 'Hizmet Bölgesi Dışı',
                        text2: data.message || 'Seçtiğiniz konum restoranın gönderim alanında değil.',
                        visibilityTime: 6000
                    });
                }

                // Şehir, İlçe ve Mahalle seçimini zincirleme (sequential) olarak yapıyoruz.
                // Bu sayede setTimeout gecikmelerine gerek kalmıyor ve mahalle anında yükleniyor.
                (async () => {
                    try {
                        let activeDistricts = districts;
                        let activeNeighborhoods = [];

                        if (data.city) {
                            const normalizedCity = data.city.toLocaleUpperCase('tr-TR').trim();
                            const cityObj = cities.find(c => c.name.toLocaleUpperCase('tr-TR').trim() === normalizedCity);
                            if (cityObj) {
                                setSelectedCity(cityObj.name);
                                activeDistricts = await fetchLocation(`/api/locations/regions/${cityObj.id}/districts`);
                                setDistricts(activeDistricts);
                            } else {
                                setSelectedCity(data.city);
                            }
                        }

                        if (data.district && activeDistricts.length > 0) {
                            const normalizedDist = data.district.toLocaleUpperCase('tr-TR').trim();
                            const distObj = activeDistricts.find(d => d.name.toLocaleUpperCase('tr-TR').trim() === normalizedDist);
                            if (distObj) {
                                setSelectedDistrict(distObj.name);
                                activeNeighborhoods = await fetchLocation(`/api/locations/districts/${distObj.id}/neighborhoods`);
                                setNeighborhoods(activeNeighborhoods);
                            } else {
                                setSelectedDistrict(data.district);
                            }
                        }

                        if (data.neighborhood) {
                            const normalizedNeigh = data.neighborhood.toLocaleUpperCase('tr-TR').trim();
                            const neighObj = activeNeighborhoods.find(n => n.name.toLocaleUpperCase('tr-TR').trim() === normalizedNeigh);
                            if (neighObj) {
                                setSelectedNeighborhood(neighObj.name);
                            } else {
                                setSelectedNeighborhood(data.neighborhood);
                                console.warn(`[DEBUG-GEOCODE] Mahalle '${data.neighborhood}' eşleşmedi.`);
                            }
                        }
                    } catch (err) {
                        console.error("[DEBUG-GEOCODE] Zincirleme konum yükleme hatası:", err);
                    }
                })();
                if (data.street) {
                    let originalStreet = data.street;
                    let extractedBinaNo = '';

                    // " No: X" veya " No:X" formatını bulup ayıkla
                    const noMatch = originalStreet.match(/ No:\s*(\S+.*)$/i);
                    if (noMatch) {
                        extractedBinaNo = noMatch[1];
                        originalStreet = originalStreet.replace(noMatch[0], '');
                    } else {
                        // Eğer "No:" formatında değilse ama caddenin sonunda sayı varsa
                        const numMatch = originalStreet.match(/\s+(\d+[\w\-\/]*\/?)?$/i);
                        if (numMatch && numMatch[1]) {
                            extractedBinaNo = numMatch[1];
                            originalStreet = originalStreet.replace(numMatch[0], '');
                        }
                    }

                    // Temizlik
                    originalStreet = originalStreet.replace(/\s*,?\s*No:?\s*$/i, '').trim();
                    if (originalStreet.endsWith(',')) {
                        originalStreet = originalStreet.slice(0, -1).trim();
                    }

                    if (extractedBinaNo) {
                        extractedBinaNo = extractedBinaNo.replace(/^(no[:\s]*)+/i, '').trim();
                    }

                    setStreet(originalStreet);
                    setBinaNo(extractedBinaNo);
                }
            } else {
                console.warn(`[DEBUG-GEOCODE] Başarısız çözümleme: ${json.message}`);
                // alert(json.message || "Adres bulunamadı");
                Toast.show({
                    type: 'error',
                    text1: 'Adres Çözümlenemedi',
                    text2: json.message || "Bu koordinatlara ait adres bulunamadı.",
                    visibilityTime: 4000
                });
            }
        } catch (e) {
            console.error("[DEBUG-GEOCODE] Konum çözümleme hatası (catch):", e.message);
        }
    };

    useEffect(() => {
        if (mapLocation && mapLocation.latitude && mapLocation.longitude) {
            setLatitude(mapLocation.latitude);
            setLongitude(mapLocation.longitude);
            
            // Eğer haritadan dönen hazır, teyit edilmiş adres bilgileri varsa direkt ata
            if (mapLocation.city && mapLocation.district && mapLocation.neighborhood) {
                (async () => {
                    try {
                        let activeDistricts = [];
                        let activeNeighborhoods = [];

                        // 1. Şehir
                        const normalizedCity = mapLocation.city.toLocaleUpperCase('tr-TR').trim();
                        const cityObj = cities.find(c => c.name.toLocaleUpperCase('tr-TR').trim() === normalizedCity);
                        if (cityObj) {
                            setSelectedCity(cityObj.name);
                            activeDistricts = await fetchLocation(`/api/locations/regions/${cityObj.id}/districts`);
                            setDistricts(activeDistricts);
                        } else {
                            setSelectedCity(mapLocation.city);
                        }

                        // 2. İlçe
                        if (mapLocation.district && activeDistricts.length > 0) {
                            const normalizedDist = mapLocation.district.toLocaleUpperCase('tr-TR').trim();
                            const distObj = activeDistricts.find(d => d.name.toLocaleUpperCase('tr-TR').trim() === normalizedDist);
                            if (distObj) {
                                setSelectedDistrict(distObj.name);
                                activeNeighborhoods = await fetchLocation(`/api/locations/districts/${distObj.id}/neighborhoods`);
                                setNeighborhoods(activeNeighborhoods);
                            } else {
                                setSelectedDistrict(mapLocation.district);
                            }
                        }

                        // 3. Mahalle
                        if (mapLocation.neighborhood && activeNeighborhoods.length > 0) {
                            const normalizedNeigh = mapLocation.neighborhood.toLocaleUpperCase('tr-TR').trim();
                            const neighObj = activeNeighborhoods.find(n => n.name.toLocaleUpperCase('tr-TR').trim() === normalizedNeigh);
                            if (neighObj) {
                                setSelectedNeighborhood(neighObj.name);
                            } else {
                                setSelectedNeighborhood(mapLocation.neighborhood);
                            }
                        }
                    } catch (err) {
                        console.error("Haritadan gelen lokasyon yükleme hatası:", err);
                    }
                })();

                setStreet(mapLocation.street || '');
                setBinaNo(mapLocation.binaNo || '');
            } else {
                // Yoksa koordinattan sıfırdan çözümle (eski akış)
                fillFormFromLocation(mapLocation.latitude, mapLocation.longitude);
            }
        }
    }, [mapLocation]);

    useEffect(() => {
        if (location && location.latitude && location.longitude) {
            setLatitude(location.latitude);
            setLongitude(location.longitude);
            fillFormFromLocation(location.latitude, location.longitude);
        }
    }, [location]);

    /* ── Konum Servisi Wrapper ── */
    const handleGetLocation = async () => {
        console.log("[DEBUG-GPS] 'Konumumu Kullan' butonuna tıklandı. getLocation() çağrılıyor...");
        const coords = await getLocation();
        if (coords) {
            console.log(`[DEBUG-GPS] Koordinatlar başarıyla alındı (Lat: ${coords.latitude}). Toast gösteriliyor...`);
            Toast.show({
                type: 'success',
                text1: 'Konum Bulundu',
                text2: 'Adres bilgileri konumunuza göre dolduruluyor...',
                position: 'top',
                visibilityTime: 3000
            });
        } else {
            console.log("[DEBUG-GPS] Koordinatlar alınamadı (coords boş döndü). Hata Toast'u useEffect üzerinden gösterilecek.");
        }
    };

    useEffect(() => {
        if (errorMsg) {
            Toast.show({
                type: 'error',
                text1: 'Konum Hatası',
                text2: errorMsg,
                position: 'top',
                visibilityTime: 5000
            });
        }
    }, [errorMsg]);

    /* ── Şehir değişince ── */
    const handleCityChange = async (val, providedCities) => {
        setSelectedCity(val);
        setSelectedDistrict('');
        setSelectedNeighborhood('');
        setDistricts([]);
        setNeighborhoods([]);
        if (!val) return;
        setLoadingDistricts(true);

        // Provided list varsa onu kullan, yoksa state'deki cities'i kullan
        const currentCities = (Array.isArray(providedCities) ? providedCities : null) || cities;
        const normalizedVal = val.toLocaleUpperCase('tr-TR').trim();
        const cityObj = currentCities.find(c => c.name.toLocaleUpperCase('tr-TR').trim() === normalizedVal);

        if (cityObj) {
            // Dropdown'da tam olarak veritabanındaki ismi seçili göster
            setSelectedCity(cityObj.name);
            const data = await fetchLocation(`/api/locations/regions/${cityObj.id}/districts`);
            setDistricts(data);

            // Otomatik seç: Eğer sadece 1 ilçe varsa ve şu an seçili değilse
            if (data.length === 1 && !selectedDistrict) {
                handleDistrictChange(data[0].name, data);
            }
        } else {
            console.warn(`[DEBUG-GEOCODE] Şehir listesinde '${val}' bulunamadı.`);
        }
        setLoadingDistricts(false);
    };

    /* ── İlçe değişince ── */
    const handleDistrictChange = async (val, providedDistricts) => {
        setSelectedDistrict(val);
        setSelectedNeighborhood('');
        setNeighborhoods([]);
        if (!val) return;
        setLoadingNeighborhoods(true);

        const currentDistricts = (Array.isArray(providedDistricts) ? providedDistricts : null) || districts;
        const normalizedVal = val.toLocaleUpperCase('tr-TR').trim();
        const distObj = currentDistricts.find(d => d.name.toLocaleUpperCase('tr-TR').trim() === normalizedVal);

        if (distObj) {
            setSelectedDistrict(distObj.name); // Tam adı set et
            const data = await fetchLocation(`/api/locations/districts/${distObj.id}/neighborhoods`);
            setNeighborhoods(data);

            // Otomatik seç: Eğer sadece 1 mahalle varsa ve şu an seçili değilse
            if (data.length === 1 && !selectedNeighborhood) {
                setSelectedNeighborhood(data[0].name);
            }
        } else {
            console.warn(`[DEBUG-GEOCODE] İlçe listesinde '${val}' bulunamadı.`);
        }
        setLoadingNeighborhoods(false);
    };

    /* ── Parent'a bildir ── */
    useEffect(() => {
        const fullStreet = binaNo ? `${street.trim()} No: ${binaNo.trim()}` : street.trim();
        const valid = !!selectedCity && !!selectedDistrict && !!selectedNeighborhood && !!street && !!binaNo && !!adresTarifi && adresTarifi.trim() !== "";

        onAdresChange({
            title: [selectedCity, selectedDistrict].filter(Boolean).join(' - ') || 'Adresim',
            city: selectedCity,
            district: selectedDistrict,
            neighborhood: selectedNeighborhood,
            street: fullStreet,
            address_detail: adresTarifi,
            is_default: isDefault ? 1 : 0,
            latitude,
            longitude,
            isValid: valid,
            validate: () => valid,
        });
    }, [selectedCity, selectedDistrict, selectedNeighborhood, street, binaNo, adresTarifi, isDefault, latitude, longitude]);

    if (loadingCities) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>Bölgeler yükleniyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            {/* --- KONUM İLE DOLDURMA BUTONLARI --- */}
            <View style={styles.locationButtonsContainer}>
                <TouchableOpacity
                    style={[styles.locationBtn, styles.mapBtn]}
                    onPress={onOpenMap}
                >
                    <Text style={styles.mapBtnText}>Haritadan Seç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.locationBtn, styles.gpsBtn]}
                    onPress={handleGetLocation}
                    disabled={isLocationFetching}
                >
                    {isLocationFetching ? (
                        <ActivityIndicator color="#333" size="small" />
                    ) : (
                        <Text style={styles.gpsBtnText}>Konumumu Kullan</Text>
                    )}
                </TouchableOpacity>
            </View>



            {/* İl + İlçe yan yana */}
            <View style={styles.row}>
                <View style={styles.half}>
                    <OutlinedPicker
                        label="İl"
                        selectedValue={selectedCity}
                        onValueChange={handleCityChange}
                        items={cities}
                        placeholder="Şehir seçin"
                        loading={loadingCities}
                    />
                </View>
                <View style={styles.half}>
                    <OutlinedPicker
                        label="İlçe"
                        selectedValue={selectedDistrict}
                        onValueChange={handleDistrictChange}
                        items={districts}
                        placeholder="İlçe seçin"
                        loading={loadingDistricts}
                        enabled={!!selectedCity}
                    />
                </View>
            </View>

            {/* Mahalle */}
            <OutlinedPicker
                label="Mahalle"
                selectedValue={selectedNeighborhood}
                onValueChange={setSelectedNeighborhood}
                items={neighborhoods}
                placeholder="Mahalle seçin"
                loading={loadingNeighborhoods}
                enabled={!!selectedDistrict}
            />

            {/* Cadde / Sokak + Bina No */}
            <View style={styles.row}>
                <View style={{ flex: 3 }}>
                    <OutlinedInput
                        label="Cadde / Sokak"
                        value={street}
                        onChangeText={setStreet}
                        placeholder="Örn: Atatürk Cad."
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <OutlinedInput
                        label="Bina No"
                        value={binaNo}
                        onChangeText={setBinaNo}
                        placeholder="No"
                        keyboardType="default"
                    />
                </View>
            </View>

            {/* Adres Tarifi */}
            <OutlinedInput
                label="Daire No ve Adres Tarifi"
                value={adresTarifi}
                onChangeText={setAdresTarifi}
                placeholder="Daire no, kat ve kurye için kısa tarif"
                multiline={true}
                numberOfLines={3}
            />

            {/* Varsayılan toggle */}
            <TouchableOpacity
                style={styles.defaultRow}
                onPress={() => setIsDefault(p => !p)}
                activeOpacity={0.7}
            >
                <View style={[styles.toggle, isDefault && styles.toggleOn]}>
                    <View style={[styles.thumb, isDefault && styles.thumbOn]} />
                </View>
                <Text style={styles.defaultLabel}>Varsayılan adresim olarak kaydet</Text>
            </TouchableOpacity>

            {/* Çocuk bileşenler (butonlar vb.) */}
            {children}

            <View style={{ height: 80 }} />
        </ScrollView>
    );
}

/* ─── Picker stilleri ────────────────────────────────────────────────── */
const pickerStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 14,
        position: 'relative',
    },
    floatLabel: {
        position: 'absolute',
        top: -9,
        left: 12,
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 4,
        fontSize: 11,
        color: '#999',
        zIndex: 1,
    },
    floatLabelFilled: {
        color: '#555',
    },
    box: {
        height: 52,
        borderWidth: 1.5,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    boxDisabled: {
        backgroundColor: '#fafafa',
        borderColor: '#eee',
    },
    valueText: {
        flex: 1,
        fontSize: 15,
        color: '#222',
        paddingLeft: 14,
    },
    placeholder: {
        color: '#bbb',
    },
    androidOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0,
        height: 52,
    },
    iosPicker: {
        flex: 1,
        height: 52,
    },
    chevron: {
        paddingRight: 12,
        fontSize: 14,
        color: '#999',
    },
});

/* ─── Input stilleri ─────────────────────────────────────────────────── */
const inputStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 14,
        position: 'relative',
    },
    floatLabel: {
        position: 'absolute',
        top: -9,
        left: 12,
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 4,
        fontSize: 11,
        color: '#999',
        zIndex: 1,
    },
    floatLabelFilled: {
        color: '#555',
    },
    box: {
        height: 52,
        borderWidth: 1.5,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#222',
    },
    multilineBox: {
        height: 90,
        paddingTop: 14,
        paddingBottom: 10,
    },
});

/* ─── Genel stiller ──────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    locationButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        gap: 10,
    },
    locationBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gpsBtn: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    mapBtn: {
        backgroundColor: '#FF6B00',
    },
    gpsBtnText: {
        color: '#333',
        fontWeight: '600',
    },
    mapBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginBottom: 10,
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    content: {
        padding: 16,
        paddingTop: 100, // %25 civarında boşluk
        paddingBottom: 140,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#888',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    half: {
        flex: 1,
    },
    defaultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 12,
    },
    toggle: {
        width: 46,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleOn: {
        backgroundColor: '#FF6B00',
    },
    thumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    thumbOn: {
        transform: [{ translateX: 20 }],
    },
    defaultLabel: {
        fontSize: 14,
        color: '#555',
        flex: 1,
    },
    addressInstruction: {
        fontSize: 13,
        fontWeight: '700',
        color: '#888',
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase', // Daha modern görünüm
        letterSpacing: 1,
    },
});

export default AdresSelector;