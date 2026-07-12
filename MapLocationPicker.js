/**
 * MapLocationPicker — Tam Ekran Harita Modal (Google Maps)
 * 
 * Sabit CSS pin + harita sürükleme (Yemeksepeti/Getir tarzı).
 * Pin her zaman ekranın ortasında, harita altında hareket ediyor.
 * 
 * Props:
 *   visible {boolean} - Modal görünür mü
 *   onClose {function} - Modal kapanış callback
 *   onLocationSelect {function} - Konum seçildiğinde callback
 *   initialLocation {{ lat, lng }} - Başlangıç konumu
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Animated } from 'react-native';
import { API_URL } from '../src/config/api';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeFetch } from '../src/utils/networkHelper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DEFAULT_CENTER = { lat: 39.9334, lng: 32.8597 };
const DEFAULT_ZOOM = 6;
const LOCATION_ZOOM = 17;

function MapLocationPicker({ visible, onClose, onLocationSelect, initialLocation }) {
    const [currentLocation, setCurrentLocation] = useState(initialLocation || null);
    const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
    const [addressInfo, setAddressInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [geocoding, setGeocoding] = useState(false);
    const [error, setError] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searching, setSearching] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [mapType, setMapType] = useState('roadmap');
    const debounceTimer = useRef(null);
    const mapRef = useRef(null);
    const initRef = useRef(false);
    const lastCenterRef = useRef(null);
    const programmaticRef = useRef(false);
    const [showInfoOverlay, setShowInfoOverlay] = useState(false);

    // Animasyon Değerleri
    const mapAnimX = useRef(new Animated.Value(0)).current;
    const handAnimX = useRef(new Animated.Value(30)).current;
    const handOpacity = useRef(new Animated.Value(0)).current;

    // ─── BİLGİLENDİRİCİ OVERLAY AÇILIŞ KONTROLÜ VE ANİMASYONLARI ───
    useEffect(() => {
        const checkOverlay = async () => {
            if (visible) {
                try {
                    const hidden = await AsyncStorage.getItem('hideMapInfoOverlay');
                    if (hidden !== 'true') {
                        setShowInfoOverlay(true);
                    }
                } catch (err) {
                    setShowInfoOverlay(true);
                }
            }
        };
        checkOverlay();
    }, [visible]);

    useEffect(() => {
        if (showInfoOverlay) {
            // Reset animasyon başlangıç değerleri
            mapAnimX.setValue(0);
            handAnimX.setValue(30);
            handOpacity.setValue(0);

            const anim = Animated.loop(
                Animated.sequence([
                    // 1. Parmak görünür hale gelir (+30px sağda)
                    Animated.timing(handOpacity, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.delay(200),
                    // 2. Sola doğru sürükleme: Harita sola kayar (-25px), parmak sola kayar (-30px)
                    Animated.parallel([
                        Animated.timing(mapAnimX, {
                            toValue: -25,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(handAnimX, {
                            toValue: -30,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.delay(200),
                    // 3. Parmak kalkar (Opaklık 0 olur)
                    Animated.timing(handOpacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    // 4. Harita yavaşça merkeze geri döner, parmak görünmez şekilde başlangıç konumuna (+30px) döner
                    Animated.parallel([
                        Animated.timing(mapAnimX, {
                            toValue: 0,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(handAnimX, {
                            toValue: 30,
                            duration: 10,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.delay(400),
                ])
            );
            anim.start();
            return () => anim.stop();
        }
    }, [showInfoOverlay]);

    const handleDismissInfo = async (dontShowAgain) => {
        setShowInfoOverlay(false);
        if (dontShowAgain) {
            await AsyncStorage.setItem('hideMapInfoOverlay', 'true');
        }
    };

    // ─── HASSAS KONUM ALMA YARDIMCISI (Trendyol Go / Getir Tarzı) ───
    const getPreciseLocation = useCallback((onSuccess, onError) => {
        if (!navigator.geolocation) {
            onError(new Error("Geolocation not supported"));
            return () => { };
        }

        let active = true;

        // Önce hızlı ve düşük doğruluklu konum dene (IP/Wifi) - Çok hızlı döner
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (!active) return;
                // Hızlı konumu hemen bildir ki harita açılsın
                onSuccess(pos);

                // Arka planda daha hassas konum dene (GPS)
                navigator.geolocation.getCurrentPosition(
                    (precisePos) => {
                        if (!active) return;
                        if (precisePos.coords.accuracy < pos.coords.accuracy) {
                            onSuccess(precisePos);
                        }
                    },
                    () => { },
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                );
            },
            (err) => {
                if (!active) return;
                // Hızlı konum başarısız olursa doğrudan hassas olanı dene
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (active) onSuccess(pos);
                    },
                    (preciseErr) => {
                        if (active) onError(preciseErr);
                    },
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                );
            },
            { enableHighAccuracy: false, timeout: 1500, maximumAge: 10000 }
        );

        return () => {
            active = false;
        };
    }, []);

    // ─── HARİTA AÇILIŞ KONUMU ───────────────────────────
    useEffect(() => {
        if (!visible) return;
        setAddressInfo(null);
        setError(null);
        setLoading(true);
        setMapReady(false);
        initRef.current = false;

        // Eğer daha önceden seçilmiş bir konum (initialLocation) varsa oraya git
        if (initialLocation && initialLocation.lat && initialLocation.lng) {
            setCurrentLocation(initialLocation);
            setSelectedLocation(initialLocation);
            setLoading(false);
            return;
        }

        const onSuccess = (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            setSelectedLocation(loc);
            setLoading(false);

            // Eğer harita zaten yüklenmişse panTo yapalım
            if (mapRef.current) {
                programmaticRef.current = true;
                mapRef.current.panTo(loc);
                setTimeout(() => { programmaticRef.current = false; }, 500);
            }
        };

        const onError = (err) => {
            // İzin reddedilirse veya zaman aşımı olursa sessizce varsayılan konuma geç (Ankara)
            setCurrentLocation(DEFAULT_CENTER);
            setSelectedLocation(DEFAULT_CENTER);
            setLoading(false);
        };

        const cleanupFn = getPreciseLocation(onSuccess, onError);

        return () => {
            if (cleanupFn) cleanupFn();
        };
    }, [visible, initialLocation, getPreciseLocation]);

    // ─── REVERSE GEOCODING ──────────────────────────────
    const fetchReverseGeocode = useCallback(async (lat, lng) => {
        setGeocoding(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const rId = await AsyncStorage.getItem('restaurant_id');
            const res = await safeFetch(`${API_URL}/api/geocode/reverse`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-restaurant-id': rId
                },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });
            const data = await res.json();
            if (data.status === "success") {
                setAddressInfo(data.data);
                if (!data.data.is_in_delivery_zone) {
                    setError(data.data.message || "Bu konum hizmet bölgemiz dışındadır.");
                } else {
                    setError(null);
                }
            } else {
                setError(data.message || "Adres bilgisi alınamadı.");
            }
        } catch (err) {
            console.error("Reverse geocoding hatası:", err);
            setError("Adres bilgisi alınamadı.");
        } finally {
            setGeocoding(false);
        }
    }, []);

    // ─── DEBOUNCED MAP MOVE ─────────────────────────────
    const handleMapMove = useCallback((lat, lng) => {
        setSelectedLocation({ lat, lng });
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchReverseGeocode(lat, lng);
        }, 600);
    }, [fetchReverseGeocode]);

    // ─── FORWARD GEOCODING ──────────────────────────────
    const handleSearch = async () => {
        if (!searchText || searchText.trim() === '') return;
        setSearching(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await safeFetch(`${API_URL}/api/geocode/forward`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: searchText })
            });
            const data = await res.json();
            if (data.status === "success") {
                const { lat, lng } = data.data;
                if (mapRef.current) {
                    programmaticRef.current = true;
                    mapRef.current.panTo({ lat, lng });
                    mapRef.current.setZoom(LOCATION_ZOOM);
                    setTimeout(() => { programmaticRef.current = false; }, 1000);
                }
                setSearchText('');
            } else {
                setError(data.message || "Adres bulunamadı.");
            }
        } catch (err) {
            setError("Arama sırasında bir hata oluştu.");
        } finally {
            setSearching(false);
        }
    };

    // ─── GOOGLE MAPS INIT ───────────────────────────────
    useEffect(() => {
        if (!visible || !currentLocation || loading) return;

        const waitForGoogle = () => {
            if (!window.google || !window.google.maps) {
                setTimeout(waitForGoogle, 150);
                return;
            }
            initMap();
        };

        const initMap = () => {
            if (initRef.current) return;
            const el = document.getElementById('google-map-container');
            if (!el) { setTimeout(initMap, 150); return; }

            const isDefault = currentLocation.lat === DEFAULT_CENTER.lat && currentLocation.lng === DEFAULT_CENTER.lng;

            const map = new window.google.maps.Map(el, {
                center: { lat: currentLocation.lat, lng: currentLocation.lng },
                zoom: isDefault ? DEFAULT_ZOOM : LOCATION_ZOOM,
                disableDefaultUI: true,
                zoomControl: true,
                zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_BOTTOM },
                gestureHandling: 'greedy',
                clickableIcons: false,
                styles: [
                    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                ],
            });

            let dragging = false;
            let preZoomCenter = null;

            map.addListener('dragstart', () => {
                preZoomCenter = null;
            });

            map.addListener('zoom_changed', () => {
                if (programmaticRef.current) return;
                if (!preZoomCenter) {
                    const last = lastCenterRef.current;
                    preZoomCenter = last ? { lat: last.lat, lng: last.lng } : map.getCenter();
                }
            });

            map.addListener('center_changed', () => {
                if (!dragging) {
                    dragging = true;
                    setIsDragging(true);
                }
            });

            map.addListener('idle', () => {
                if (dragging) {
                    dragging = false;
                    setIsDragging(false);
                }

                if (preZoomCenter) {
                    const target = preZoomCenter;
                    preZoomCenter = null;
                    map.panTo(target);
                    return;
                }

                const c = map.getCenter();
                if (!c) return;
                const lat = c.lat(), lng = c.lng();

                const last = lastCenterRef.current;
                if (last && Math.abs(last.lat - lat) < 0.00001 && Math.abs(last.lng - lng) < 0.00001) return;

                lastCenterRef.current = { lat, lng };
                handleMapMove(lat, lng);
            });

            mapRef.current = map;
            initRef.current = true;
            setMapReady(true);

            if (!isDefault) {
                fetchReverseGeocode(currentLocation.lat, currentLocation.lng);
            }
        };

        const t = setTimeout(waitForGoogle, 100);
        return () => {
            clearTimeout(t);
            if (mapRef.current) {
                window.google?.maps?.event?.clearInstanceListeners(mapRef.current);
                mapRef.current = null;
            }
            initRef.current = false;
        };
    }, [visible, currentLocation, loading]);

    // ─── ONAYLA ─────────────────────────────────────────
    const handleConfirm = () => {
        if (!addressInfo || !addressInfo.is_in_delivery_zone || !selectedLocation) return;

        let originalStreet = addressInfo.street || '';
        let extractedBinaNo = '';
        const noMatch = originalStreet.match(/ No:\s*(\S+.*)$/i);
        if (noMatch) {
            extractedBinaNo = noMatch[1];
            originalStreet = originalStreet.replace(noMatch[0], '');
        } else {
            const numMatch = originalStreet.match(/\s+(\d+[\w\-\/]*\/?)?$/i);
            if (numMatch && numMatch[1]) {
                extractedBinaNo = numMatch[1];
                originalStreet = originalStreet.replace(numMatch[0], '');
            }
        }
        originalStreet = originalStreet.replace(/\s*,?\s*No:?\s*$/i, '').trim();
        if (originalStreet.endsWith(',')) {
            originalStreet = originalStreet.slice(0, -1).trim();
        }
        if (extractedBinaNo) {
            extractedBinaNo = extractedBinaNo.replace(/^(no[:\s]*)+/i, '').trim();
        }

        onLocationSelect({
            city: addressInfo.city,
            district: addressInfo.district,
            neighborhood: addressInfo.neighborhood,
            street: originalStreet,
            binaNo: extractedBinaNo.trim(),
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            formatted_address: addressInfo.formatted_address,
            region_id: addressInfo.region_id,
            district_id: addressInfo.district_id,
            neighborhood_id: addressInfo.neighborhood_id
        });
        onClose();
    };

    // ─── KONUMUMA GİT ───────────────────────────────────
    const goToMyLocation = () => {
        if (!navigator.geolocation) return;
        setSearching(true);
        setError(null);

        const onSuccess = (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (mapRef.current) {
                programmaticRef.current = true;
                mapRef.current.panTo(loc);
                mapRef.current.setZoom(LOCATION_ZOOM);
                setTimeout(() => { programmaticRef.current = false; }, 1000);
            }
            setSearching(false);
        };

        const onError = () => {
            setSearching(false);
            setError("Konum alınamadı.");
        };

        getPreciseLocation(onSuccess, onError);
    };

    // ─── HARİTA TİPİ ───────────────────────────────────
    const toggleMapType = () => {
        const t = mapType === 'roadmap' ? 'satellite' : 'roadmap';
        setMapType(t);
        if (mapRef.current) mapRef.current.setMapTypeId(t);
    };

    if (!visible) return null;
    const canConfirm = addressInfo && addressInfo.is_in_delivery_zone && !geocoding;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Teslimat Konumunu Seçin</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Harita Alanı */}
                <View style={styles.mapArea}>
                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#FF6B00" />
                            <Text style={styles.loadingText}>Konum alınıyor...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Google Maps */}
                            <div
                                id="google-map-container"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    zIndex: 1,
                                    touchAction: 'none',
                                }}
                            />

                            {/* ─── SABİT PİN (CSS, ekranın tam ortası) ─── */}
                            <View style={styles.pinOverlay} pointerEvents="none">
                                <View style={styles.pinAnchor}>
                                    <View style={[styles.pinMain, isDragging && styles.pinMainLifted]}>
                                        <View style={styles.pinCircle} />
                                    </View>
                                    <View style={styles.pinNeedle} />
                                    {isDragging && (
                                        <View style={styles.pinShadowLineContainer}>
                                            <View style={styles.pinShadowDot} />
                                            <View style={styles.pinShadowDot} />
                                            <View style={styles.pinShadowDot} />
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Arama Çubuğu */}
                            <View style={styles.searchBar}>
                                <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Adres veya konum ara..."
                                    placeholderTextColor="#999"
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    onSubmitEditing={handleSearch}
                                    returnKeyType="search"
                                />
                                {searching ? (
                                    <ActivityIndicator size="small" color="#FF6B00" />
                                ) : searchText.length > 0 ? (
                                    <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                                        <Text style={styles.searchBtnText}>Ara</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {/* Geocoding badge */}
                            {geocoding && (
                                <View style={styles.badge}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.badgeText}>Adres aranıyor...</Text>
                                </View>
                            )}

                            {/* İpucu */}
                            {!addressInfo && !geocoding && mapReady && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Haritayı sürükleyerek konum seçin</Text>
                                </View>
                            )}

                            {/* Harita tipi butonu */}
                            <TouchableOpacity style={styles.fabLeft} onPress={toggleMapType} activeOpacity={0.7}>
                                <Text style={{ fontSize: 22 }}>{mapType === 'roadmap' ? '🛰️' : '🗺️'}</Text>
                            </TouchableOpacity>

                            {/* Konumuma git */}
                            <TouchableOpacity style={styles.fabRight} onPress={goToMyLocation} activeOpacity={0.7}>
                                {searching ? (
                                    <ActivityIndicator size="small" color="#4285F4" />
                                ) : (
                                    <Text style={{ fontSize: 20, color: '#4285F4', fontWeight: 'bold' }}>◎</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Alt Panel */}
                <View style={styles.bottomPanel}>
                    {addressInfo ? (
                        <View style={styles.addrRow}>
                            <View style={[styles.dot, addressInfo.is_in_delivery_zone ? styles.dotGreen : styles.dotRed]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.addrMain} numberOfLines={2}>
                                    {addressInfo.formatted_address || `${addressInfo.neighborhood || ''} ${addressInfo.street || ''}`}
                                </Text>
                                <Text style={styles.addrSub}>{addressInfo.district} / {addressInfo.city}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.addrRow}>
                            <View style={[styles.dot, { backgroundColor: '#ccc' }]} />
                            <Text style={styles.addrPlaceholder}>Haritayı sürükleyerek konumunuzu seçin</Text>
                        </View>
                    )}

                    {error && (
                        <View style={[styles.alert, addressInfo && !addressInfo.is_in_delivery_zone ? styles.alertWarn : styles.alertInfo]}>
                            <Text style={styles.alertText}>
                                {addressInfo && !addressInfo.is_in_delivery_zone ? '⚠️' : 'ℹ️'} {error}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.hint}>
                        ℹ️ Kuryeniz işaretlediğiniz konuma gelecek. Yazılı adresinizi bir sonraki sayfada güncelleyebilirsiniz.
                    </Text>

                    <TouchableOpacity
                        style={[styles.confirmBtn, !canConfirm && styles.confirmBtnOff]}
                        onPress={handleConfirm}
                        disabled={!canConfirm}
                        activeOpacity={0.8}
                    >
                        {geocoding ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.confirmText}>Adres aranıyor...</Text>
                            </View>
                        ) : (
                            <Text style={[styles.confirmText, !canConfirm && { color: '#999' }]}>
                                Bu Konuma Sipariş Ver
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Bilgilendirici Overlay */}
                {showInfoOverlay && (
                    <View style={styles.infoOverlayContainer}>
                        <View style={styles.infoOverlayCard}>
                            {/* Kapatma Butonu (X) */}
                            <TouchableOpacity
                                style={styles.infoCloseBtn}
                                onPress={() => handleDismissInfo(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.infoCloseBtnText}>✕</Text>
                            </TouchableOpacity>

                            {/* Başlık */}
                            <Text style={styles.infoOverlayTitle}>
                                Haritayı kaydırarak konumunuzu düzenleyebilirsiniz.
                            </Text>

                            {/* Harita / Grid Simüle Edilmiş Görsel */}
                            <View style={styles.mapIllustrationWindow}>
                                {/* Hareketli Harita Katmanı (Yollar + Park + Su + Binalar + Yeşil Alan) */}
                                <Animated.View style={{ flex: 1, width: '100%', height: '100%', position: 'absolute', transform: [{ translateX: mapAnimX }] }}>
                                    {/* Yeşil Park Alanı */}
                                    <View style={[styles.mapPark, { top: 10, left: -20, width: 80, height: 60 }]} />

                                    {/* Mavi Su/Göl Alanı */}
                                    <View style={[styles.mapWater, { top: 110, left: 190, width: 130, height: 50 }]} />

                                    {/* Binalar */}
                                    <View style={[styles.mapBuilding, { top: 12, left: 75, width: 35, height: 28 }]} />
                                    <View style={[styles.mapBuilding, { top: 22, left: 165, width: 30, height: 40 }]} />
                                    <View style={[styles.mapBuilding, { top: 105, left: 85, width: 40, height: 35 }]} />
                                    <View style={[styles.mapBuilding, { top: 115, left: 15, width: 50, height: 28 }]} />

                                    {/* Yollar */}
                                    {/* Ana Caddeler (Şerit çizgili) */}
                                    <View style={[styles.mapRoadMain, { top: 72, left: -60, width: 420, height: 18, transform: [{ rotate: '-6deg' }] }]}>
                                        <View style={styles.laneDividerHorizontal} />
                                    </View>
                                    <View style={[styles.mapRoadMain, { top: -30, left: 135, width: 18, height: 220, transform: [{ rotate: '10deg' }] }]}>
                                        <View style={styles.laneDividerVertical} />
                                    </View>

                                    {/* Ara Sokaklar */}
                                    <View style={[styles.mapRoadSide, { top: 15, left: 95, width: 100, height: 10, transform: [{ rotate: '40deg' }] }]} />
                                    <View style={[styles.mapRoadSide, { top: 108, left: -10, width: 140, height: 10, transform: [{ rotate: '-15deg' }] }]} />

                                    {/* Yeşil Dairesel Dilim (Radar/Precision Alanı) */}
                                    <View style={styles.greenSectorContainer}>
                                        <View style={styles.greenSectorInner} />
                                    </View>
                                </Animated.View>

                                {/* Yeşil Pin (Ortada Sabit Kalır) */}
                                <View style={styles.illustrationPin}>
                                    <View style={styles.illustrationPinCircle} />
                                    <View style={styles.illustrationPinNeedle} />
                                </View>

                                {/* Harita Üstündeki Konum Balonu (Ortada Sabit Kalır) */}
                                <View style={styles.illustrationLocationBadge}>
                                    <Text style={styles.illustrationLocationText}>
                                        {addressInfo?.city ? `${addressInfo.city}, Türkiye` : 'İstanbul, Türkiye'}
                                    </Text>
                                </View>

                                {/* Parmağı Sürükleme İkonu (Sürükleme Hareketini Takip Eder) */}
                                <Animated.View style={[styles.dragIndicator, { transform: [{ translateX: handAnimX }], opacity: handOpacity }]}>
                                    <MaterialCommunityIcons name="gesture-swipe-horizontal" size={18} color="#444" />
                                </Animated.View>
                            </View>

                            {/* Orta Açıklama */}
                            <Text style={styles.infoOverlayText}>
                                Teslimatınız haritada seçtiğiniz konuma yapılacaktır.
                            </Text>

                            {/* Anladım Butonu */}
                            <TouchableOpacity
                                style={styles.infoOverlayBtn}
                                onPress={() => handleDismissInfo(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.infoOverlayBtnText}>Anladım</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
            <Toast position="top" />
        </Modal>
    );
}

// ─── STİLLER ────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', zIndex: 10,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5',
        alignItems: 'center', justifyContent: 'center',
    },
    closeBtnText: { fontSize: 18, color: '#333', fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },

    // Harita
    mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' },
    loadingText: { marginTop: 12, fontSize: 15, color: '#666' },

    // ─── SABİT PİN ─────────────────────────────────────
    pinOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    pinAnchor: {
        alignItems: 'center',
        // Pin ucunun tam olarak merkez noktasında olması için:
        // pinAnchor yüksekliği 46px'tir. Tam ortalandığı için dikey merkezi (23px) ekranın ortasındadır.
        // Ucunun (en alt kısmının) ortada olması için 23px yukarı kaydırmamız gerekir.
        transform: [{ translateY: -23 }],
    },
    pinMain: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FF6B00',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 5, elevation: 8,
    },
    pinMainLifted: {
        marginTop: -14,
    },
    pinCircle: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff',
    },
    pinNeedle: {
        width: 0, height: 0,
        borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 12,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: '#FF6B00',
        marginTop: -2,
    },
    pinShadowLineContainer: {
        height: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    pinShadowDot: {
        width: 3,
        height: 3,
        backgroundColor: '#FF6B00',
        borderRadius: 1.5,
    },

    // Arama
    searchBar: {
        position: 'absolute', top: 16, left: 16, right: 16, height: 50,
        backgroundColor: '#fff', borderRadius: 25,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 6, zIndex: 1001,
    },
    searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#333', outlineStyle: 'none' },
    searchBtn: {
        backgroundColor: '#FF6B00', paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 16, marginLeft: 8,
    },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Badge
    badge: {
        position: 'absolute', top: 76, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8, zIndex: 1000,
        left: '50%', transform: [{ translateX: -80 }],
    },
    badgeText: { color: '#fff', fontSize: 13, marginLeft: 6 },

    // FAB butonları
    fabLeft: {
        position: 'absolute', bottom: 24, left: 16, width: 48, height: 48, borderRadius: 12,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5, zIndex: 1000,
    },
    fabRight: {
        position: 'absolute', bottom: 110, right: 10, width: 40, height: 40, borderRadius: 2,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5, zIndex: 1000,
    },

    // Alt Panel
    bottomPanel: {
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 34,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12,
        elevation: 10, marginTop: -20, zIndex: 2,
    },
    addrRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 5 },
    dotGreen: { backgroundColor: '#34C759' },
    dotRed: { backgroundColor: '#FF3B30' },
    addrMain: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', lineHeight: 20 },
    addrSub: { fontSize: 13, color: '#888', marginTop: 2 },
    addrPlaceholder: { fontSize: 14, color: '#999', fontStyle: 'italic', flex: 1 },
    alert: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
    alertWarn: { backgroundColor: '#FFF3E0' },
    alertInfo: { backgroundColor: '#E3F2FD' },
    alertText: { fontSize: 13, color: '#333', lineHeight: 18 },
    hint: { fontSize: 12, color: '#999', lineHeight: 17, marginBottom: 12 },
    confirmBtn: {
        backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    confirmBtnOff: { backgroundColor: '#E0E0E0', shadowOpacity: 0 },
    confirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // Bilgilendirici Overlay Stilleri
    infoOverlayContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10002,
    },
    infoOverlayCard: {
        width: '85%',
        maxWidth: 340,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingTop: 36,
        paddingBottom: 24,
        alignItems: 'center',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    infoCloseBtn: {
        position: 'absolute',
        top: 14,
        right: 18,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    infoCloseBtnText: {
        fontSize: 18,
        color: '#8E8E93',
        fontWeight: 'bold',
    },
    infoOverlayTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    mapIllustrationWindow: {
        width: '100%',
        height: 160,
        backgroundColor: '#ECEBE6',
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    mapPark: {
        position: 'absolute',
        backgroundColor: '#D4EDDA',
        borderColor: '#C3E6CB',
        borderWidth: 1,
        borderRadius: 8,
    },
    mapWater: {
        position: 'absolute',
        backgroundColor: '#D1ECF1',
        borderColor: '#BEE5EB',
        borderWidth: 1,
        borderRadius: 10,
    },
    mapBuilding: {
        position: 'absolute',
        backgroundColor: '#FFFDF0',
        borderColor: '#EBE9D8',
        borderWidth: 1,
        borderRadius: 4,
    },
    mapRoadMain: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    laneDividerHorizontal: {
        width: '100%',
        height: 1,
        borderStyle: 'dashed',
        borderWidth: 0.5,
        borderColor: '#CCCCCC',
    },
    laneDividerVertical: {
        height: '100%',
        width: 1,
        borderStyle: 'dashed',
        borderWidth: 0.5,
        borderColor: '#CCCCCC',
    },
    mapRoadSide: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
    },
    greenSectorContainer: {
        position: 'absolute',
        top: 45,
        left: '50%',
        marginLeft: -45,
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(52, 168, 83, 0.15)',
        borderWidth: 1.5,
        borderColor: '#34A853',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    greenSectorInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        borderColor: '#34A853',
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
    },
    illustrationPin: {
        position: 'absolute',
        top: 58,
        left: '50%',
        marginLeft: -12,
        alignItems: 'center',
        zIndex: 10,
    },
    illustrationPinCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FF6B00',
        borderWidth: 2.5,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    illustrationPinNeedle: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#FF6B00',
        marginTop: -1,
    },
    illustrationLocationBadge: {
        position: 'absolute',
        top: 24,
        alignSelf: 'center',
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 11,
    },
    illustrationLocationText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1C1C1E',
    },
    dragIndicator: {
        position: 'absolute',
        top: 75,
        left: '50%',
        marginLeft: 10,
        backgroundColor: '#fff',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
        zIndex: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    infoOverlayText: {
        fontSize: 13,
        color: '#3A3A3C',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '500',
    },
    infoOverlayBtn: {
        backgroundColor: '#000',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    infoOverlayBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    infoOverlayFooterText: {
        width: '85%',
        maxWidth: 340,
        fontSize: 12,
        color: '#E5E5EA',
        lineHeight: 18,
        textAlign: 'center',
        marginTop: 18,
    },
    infoOverlayLinkBtn: {
        paddingVertical: 10,
        marginTop: 8,
    },
    infoOverlayLinkBtnText: {
        color: '#AEAEB2',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
});

export default MapLocationPicker;
