import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableWithoutFeedback
} from 'react-native';

const { width } = Dimensions.get('window');

const ModernAlert = ({ 
    visible, 
    title, 
    message, 
    onPrimaryPress, 
    onSecondaryPress,
    primaryText = 'Tamam',
    secondaryText = 'İptal',
    primaryColor = '#FF6B00',
    secondaryColor = '#666',
    icon = '🔐'
}) => {
    const [scaleValue] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.spring(scaleValue, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(scaleValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onSecondaryPress}
        >
            <TouchableWithoutFeedback onPress={onSecondaryPress}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.modalContainer,
                                {
                                    transform: [
                                        { scale: scaleValue },
                                    ],
                                },
                            ]}
                        >
                            {/* İkon */}
                            {icon ? (
                                <View style={styles.iconContainer}>
                                    <View style={styles.iconCircle}>
                                        <Text style={styles.iconText}>{icon}</Text>
                                    </View>
                                </View>
                            ) : null}

                            {/* Başlık */}
                            <Text style={styles.title}>{title}</Text>

                            {/* Mesaj */}
                            <Text style={styles.message}>{message}</Text>

                            {/* Butonlar */}
                            <View style={styles.buttonContainer}>
                                {/* Secondary Button */}
                                {secondaryText ? (
                                    <TouchableOpacity
                                        style={[styles.button, styles.secondaryButton]}
                                        onPress={onSecondaryPress}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.buttonText, { color: secondaryColor }]}>
                                            {secondaryText}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}

                                {/* Primary Button */}
                                <TouchableOpacity
                                    style={[styles.button, styles.primaryButton, { backgroundColor: primaryColor }]}
                                    onPress={onPrimaryPress}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.buttonText, styles.primaryButtonText]}>
                                        {primaryText}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 16,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 36,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    secondaryButton: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    primaryButton: {
        shadowColor: '#FF6B00',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    primaryButtonText: {
        color: 'white',
    },
});

export default ModernAlert;
