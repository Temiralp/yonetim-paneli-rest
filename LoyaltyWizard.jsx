import React, { useState, useEffect } from 'react';
import { Steps, Button, Card, Spin } from 'antd';
import { loyaltyService } from '../../services/loyaltyService';
import { useToast } from '../../context/ToastContext';

// Alt bileşenler
import StepSelectTemplate from './Steps/StepSelectTemplate';
import StepConfigureRules from './Steps/StepConfigureRules';
import StepConfigureRewards from './Steps/StepConfigureRewards';

const { Step } = Steps;

const LoyaltyWizard = ({ onClose, onSuccess, initialTemplateId }) => {
    const { showToast } = useToast();
    const [current, setCurrent] = useState(initialTemplateId ? 1 : 0);
    const [loading, setLoading] = useState(true);
    const [masterData, setMasterData] = useState(null);
    const [ruleErrors, setRuleErrors] = useState({});
    const [rewardErrors, setRewardErrors] = useState({});

    // Form Verisi (State)
    const [formData, setFormData] = useState({
        template_id: initialTemplateId || null,
        template_key: initialTemplateId || null, // Görsel seçim için
        title: '', // Backend 'name' bekliyor ama UI'da Title diyebiliriz, düzeltelim
        name: '',
        description: '',
        start_date: null,
        end_date: null,
        priority: 0,
        campaign_order: 1,
        rules_config: [], // Kurallar
        reward_config: {} // Ödül
    });

    // Master datayı çek
    useEffect(() => {
        const init = async () => {
            try {
                const res = await loyaltyService.getMasterData();
                if (res.status === 'success') {
                    let md = res.data;

                    // Kategorileri de çek ve masterData'ya ekle
                    try {
                        const catRes = await loyaltyService.getAllCategories();
                        md = { ...md, categories: catRes.data || catRes || [] };
                    } catch (e) {
                        md = { ...md, categories: [] };
                    }

                    setMasterData(md);
                }
            } catch (error) {
                console.error("Master Data Hatası:", error);
                showToast("Veriler yüklenemedi: " + error.message, "error");
                onClose();
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const validateRules = () => {
        const rules = formData.rules_config || [];
        const errors = {};
        let hasError = false;
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            if (!rule.Key) {
                errors[i] = 'Koşul tipi seçiniz';
                hasError = true;
                continue;
            }
            const ruleDef = masterData?.rules?.find(r => r.rule_key === rule.Key);
            if (ruleDef && (ruleDef.input_type === 'Hidden' || ruleDef.input_type === 'Boolean')) continue;
            if (rule.Value === '' || rule.Value === null || rule.Value === undefined ||
                (Array.isArray(rule.Value) && rule.Value.length === 0)) {
                errors[i] = 'Bu alan boş bırakılamaz';
                hasError = true;
            }
        }
        setRuleErrors(errors);
        return !hasError;
    };

    const next = () => {
        // Kurallar adımından (step 1) ilerliyorsa
        if (current === 1) {
            const rules = formData.rules_config || [];
            if (rules.length === 0) {
                showToast("Lütfen kampanya için en az bir kural ekleyiniz.", "warning");
                return;
            }
            if (!validateRules()) return;
        }
        
        setCurrent(current + 1);
    };

    const prev = () => setCurrent(current - 1);

    const handleSave = async () => {
        if (!formData.name) {
            showToast("Lütfen kampanya adı giriniz.", "warning");
            return;
        }

        // Kural validasyonu (Son kontrol)
        const rules = formData.rules_config || [];
        if (rules.length === 0) {
            showToast("Kural eklemeden kampanya kaydedemezsiniz.", "warning");
            setCurrent(1); // Kurallar sekmesine geri at
            return;
        }
        if (!validateRules()) {
            setCurrent(1);
            return;
        }

        // Ödül validasyonu
        const reward = formData.reward_config || {};
        const rwErrors = {};
        if (!reward.Type) {
            rwErrors.type = 'Lütfen bir ödül tipi seçiniz';
            showToast("Lütfen bir ödül tipi seçiniz.", "warning");
        } else {
            const rewardKey = reward.Type?.toUpperCase().replace(/_/g, '');
            if (['FIXEDAMOUNT', 'WALLETCASHBACK', 'AMOUNT', 'CASHBACK', 'DISCOUNT'].includes(rewardKey) && !reward.Value) {
                rwErrors.value = 'Ödül tutarını giriniz';
            }
            if (rewardKey === 'FREEPRODUCT') {
                if (!reward.CategoryId) {
                    rwErrors.category = 'Kategori seçiniz';
                } else if (!reward.Value) {
                    rwErrors.value = 'Hediye ürün seçiniz';
                }
            }
        }

        if (Object.keys(rwErrors).length > 0) {
            setRewardErrors(rwErrors);
            return;
        }

        try {
            await loyaltyService.createCampaign(formData);
            showToast("Kampanya başarıyla oluşturuldu! 🎉", "success");
            onSuccess();
        } catch (error) {
            console.error("LoyaltyWizard handleSave Error:", error);
            showToast("Hata: " + error.message, "error");
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '300px', width: '100%' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Yükleniyor...</div>
            </div>
        );
    }

    // Adımların içeriği
    const steps = [
        {
            title: 'Şablon Seçimi',
            content: <StepSelectTemplate
                masterData={masterData}
                data={formData}
                onChange={setFormData} // State update fonksiyonu
            />
        },
        {
            title: 'Kurallar',
            content: <StepConfigureRules
                masterData={masterData}
                data={formData}
                onChange={(updater) => { setRuleErrors({}); setFormData(updater); }}
                ruleErrors={ruleErrors}
            />
        },
        {
            title: 'Ödüller',
            content: <StepConfigureRewards
                masterData={masterData}
                data={formData}
                onChange={(updater) => { setRewardErrors({}); setFormData(updater); }}
                rewardErrors={rewardErrors}
            />
        }
    ];

    return (
        <Card title="Yeni Kampanya Oluştur">
            <Steps current={current} style={{ marginBottom: 24 }}>
                {steps.map(item => <Step key={item.title} title={item.title} />)}
            </Steps>

            <div style={{ minHeight: '300px', marginBottom: 24 }}>
                {steps[current]?.content}
            </div>

            <div className="steps-action" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {current > 0 && !initialTemplateId && (
                    <Button onClick={prev}>
                        Geri
                    </Button>
                )}
                <Button onClick={onClose} danger>Vazgeç</Button>

                {current < steps.length - 1 && (
                    <Button type="primary" onClick={next} disabled={!formData.template_id}>
                        İleri
                    </Button>
                )}
                {current === steps.length - 1 && (
                    <Button type="primary" onClick={handleSave}>
                        Kaydet ve Yayınla
                    </Button>
                )}
            </div>
        </Card>
    );
};

export default LoyaltyWizard;
