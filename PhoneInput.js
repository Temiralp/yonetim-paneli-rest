import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

/**
 * [SOLID: Single Responsibility Principle]
 * Telefon numarası girişi, validasyonu ve otomatik tamamlama özelliklerinden sorumlu tek bileşen.
 */
const PhoneInput = ({ value, onChangeText, placeholder = "5XX XXX XX XX", containerStyle }) => {
    return (
        <View style={[styles.phoneInputContainer, containerStyle]}>
            <Text style={styles.phonePrefix}>0</Text>
            <TextInput
                style={styles.phoneInput}
                placeholder={placeholder}
                value={value}
                onChangeText={(text) => {
                    console.log(`[PhoneInput Debug] Ham Gelen Veri: ${text}`);
                    // 1. Sadece rakamları al
                    let numericValue = text.replace(/[^0-9]/g, '');
                    
                    // 2. Eğer ülke kodu (90) veya başındaki (0) ile geldiyse temizle
                    if (numericValue.length > 10) {
                        if (numericValue.startsWith('90')) {
                            numericValue = numericValue.substring(2);
                        }
                        if (numericValue.startsWith('0')) {
                            numericValue = numericValue.substring(1);
                        }
                    }
                    
                    // Son olarak 10 haneyle sınırla
                    if (numericValue.length > 10) {
                        numericValue = numericValue.substring(0, 10);
                    }
                    
                    onChangeText(numericValue);
                }}
                keyboardType="phone-pad"
                // maxLength={10} kaldırıldı çünkü klavye +90 veya boşluklarla yapıştırdığında ilk 10 karakteri kesiyordu
                // --- AUTOFILL (KLAVYE İLE OTOMATİK DOLDURMA) İÇİN KRİTİK PROPLAR ---
                textContentType="telephoneNumber" // iOS için
                autoComplete="tel" // Android için
                importantForAutofill="yes"
                dataDetectorTypes="phoneNumber"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        minHeight: 50,
    },
    phonePrefix: {
        paddingHorizontal: 15,
        fontSize: 16,
        color: '#666',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
    },
});

export default PhoneInput;
