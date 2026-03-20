import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  FolderKanban,
  KeyRound,
  LockKeyhole,
  Mail,
  MessageCircleMore,
  Shield,
  Sparkles
} from "lucide-react";

import type {
  BootstrapPayload,
  LicenseActivationInput,
  OnboardingSetupInput
} from "../../../../shared/contracts";
import { domizanLogoUrl, domizanMascotUrl } from "../../lib/assets";
import { useAppStore } from "../app/app-store";

type OnboardingPageProps = {
  bootstrap: BootstrapPayload;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Henüz başlamadı";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const getAccessTitle = (bootstrap: BootstrapPayload) => {
  if (bootstrap.access.mode === "licensed") {
    return "Lisans doğrulandı";
  }

  if (bootstrap.access.mode === "trial") {
    return "Deneme aktif";
  }

  if (bootstrap.access.canStartTrial) {
    return "7 günlük deneme hazır";
  }

  return "Erişim kilitli";
};

const getAccessDescription = (bootstrap: BootstrapPayload) => {
  if (bootstrap.access.mode === "trial") {
    return `${bootstrap.access.trial.daysLeft} gün kalan deneme süresiyle uygulamayı hemen kullanabilirsin.`;
  }

  if (bootstrap.access.mode === "licensed") {
    return "Bu kurulum için lisans aktif. Uygulama güvenli şekilde kullanılabilir.";
  }

  return bootstrap.access.reason ?? "Kurulum lisans doğrulaması bekliyor.";
};

export function OnboardingPage({ bootstrap }: OnboardingPageProps) {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const startTrial = useAppStore((state) => state.startTrial);
  const activateLicense = useAppStore((state) => state.activateLicense);
  const validateStoredLicense = useAppStore((state) => state.validateStoredLicense);
  const openCheckout = useAppStore((state) => state.openCheckout);

  const [setupStep, setSetupStep] = useState<"welcome" | "workspace">(
    bootstrap.onboarding.isComplete ? "workspace" : "welcome"
  );
  const [setupForm, setSetupForm] = useState<OnboardingSetupInput>({
    officeName: bootstrap.workspace?.officeName ?? "",
    ownerName: bootstrap.workspace?.ownerName ?? "",
    ownerEmail: bootstrap.workspace?.ownerEmail ?? ""
  });
  const [licenseForm, setLicenseForm] = useState<LicenseActivationInput>({
    licenseKey: "",
    email: bootstrap.workspace?.ownerEmail ?? "",
    instanceName: ""
  });
  const [busyAction, setBusyAction] = useState<"workspace" | "trial" | "license" | "checkout" | "validate" | null>(
    null
  );
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(
    null
  );

  useEffect(() => {
    setSetupForm({
      officeName: bootstrap.workspace?.officeName ?? "",
      ownerName: bootstrap.workspace?.ownerName ?? "",
      ownerEmail: bootstrap.workspace?.ownerEmail ?? ""
    });
    setLicenseForm((current) => ({
      ...current,
      email: bootstrap.workspace?.ownerEmail ?? current.email ?? ""
    }));
  }, [bootstrap.workspace?.officeName, bootstrap.workspace?.ownerEmail, bootstrap.workspace?.ownerName]);

  useEffect(() => {
    if (bootstrap.onboarding.isComplete) {
      setSetupStep("workspace");
    }
  }, [bootstrap.onboarding.isComplete]);

  const currentStep = bootstrap.onboarding.isComplete ? "access" : setupStep;
  const accessTitle = useMemo(() => getAccessTitle(bootstrap), [bootstrap]);
  const accessDescription = useMemo(() => getAccessDescription(bootstrap), [bootstrap]);
  const installationIdShort = bootstrap.access.installation.installationId.slice(0, 8).toUpperCase();
  const checkoutDisabled = !bootstrap.summary.lemonReady;

  const handleWorkspaceSubmit = async () => {
    setBusyAction("workspace");
    setFeedback(null);

    try {
      await completeOnboarding(setupForm);
      setFeedback({
        type: "success",
        message: "Ofis bilgileri kaydedildi. Şimdi deneme ya da lisans adımına geçebilirsin."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Onboarding kaydedilemedi."
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartTrial = async () => {
    setBusyAction("trial");
    setFeedback(null);

    try {
      await startTrial();
      setFeedback({
        type: "success",
        message: "7 günlük deneme bu makine için güvenli şekilde başlatıldı."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Deneme başlatılamadı."
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleActivateLicense = async () => {
    setBusyAction("license");
    setFeedback(null);

    try {
      const result = await activateLicense(licenseForm);

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "Lisans etkinleştirilemedi."
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Lisans başarıyla etkinleştirildi."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Lisans etkinleştirilirken hata oluştu."
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckout = async () => {
    setBusyAction("checkout");
    setFeedback(null);

    try {
      const result = await openCheckout({
        email: setupForm.ownerEmail || undefined,
        name: setupForm.ownerName || undefined
      });

      if (!result.opened) {
        setFeedback({
          type: "error",
          message: result.error ?? "Satın alma sayfası açılamadı."
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Satın alma sayfası tarayıcıda açıldı."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Satın alma sayfası açılamadı."
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleValidateLicense = async () => {
    setBusyAction("validate");
    setFeedback(null);

    try {
      await validateStoredLicense();
      setFeedback({
        type: "success",
        message: "Kayıtlı lisans yeniden doğrulandı."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Lisans doğrulanamadı."
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-grid">
        <section className="onboarding-hero">
          <div className="onboarding-brand">
            <img alt="Domizan logosu" className="onboarding-logo" src={domizanLogoUrl} />
            <span className="onboarding-chip">İlk Kurulum</span>
          </div>

          <div className="onboarding-copy">
            <p className="eyebrow">Kurulum Sırası</p>
            <h1>Ofisi tanımla, erişimi başlat ve güvenli çalışma alanına geç.</h1>
            <p>
              Domizan bu makineyi bağlar, 7 günlük denemeyi tek kurulum olarak yönetir ve aynı
              bilgisayarda farklı kullanıcı profillerinden tekrar deneme başlatılmasını engeller.
            </p>
          </div>

          <div className="onboarding-stepper">
            <div className={`step-chip ${currentStep === "welcome" ? "is-active" : ""}`}>
              <Sparkles size={16} />
              <span>Karşılama</span>
            </div>
            <div className={`step-chip ${currentStep === "workspace" ? "is-active" : ""}`}>
              <Building2 size={16} />
              <span>Ofis Bilgileri</span>
            </div>
            <div className={`step-chip ${currentStep === "access" ? "is-active" : ""}`}>
              <Shield size={16} />
              <span>Erişim</span>
            </div>
          </div>

          <div className="onboarding-highlight-grid">
            <article className="onboarding-highlight">
              <FolderKanban size={18} />
              <div>
                <strong>Ortak GelenKutusu</strong>
                <p>Çalışanlar belgeyi toplar, Domizan düzeni yürütür.</p>
              </div>
            </article>
            <article className="onboarding-highlight">
              <MessageCircleMore size={18} />
              <div>
                <strong>Telegram sahibin kanalıdır</strong>
                <p>Gece sorguları, günlük brif ve hatırlatmalar burada kalır.</p>
              </div>
            </article>
            <article className="onboarding-highlight">
              <Shield size={18} />
              <div>
                <strong>Makineye bağlı güvenlik</strong>
                <p>Kurulum, paylaşımlı bilgisayar senaryosuna göre kilitlenir.</p>
              </div>
            </article>
          </div>

          <div className="onboarding-device-card">
            <div className="onboarding-device-row">
              <span>Cihaz</span>
              <strong>{bootstrap.access.installation.deviceLabel}</strong>
            </div>
            <div className="onboarding-device-row">
              <span>Platform</span>
              <strong>{bootstrap.access.installation.platform}</strong>
            </div>
            <div className="onboarding-device-row">
              <span>Kurulum kimliği</span>
              <strong>{installationIdShort}</strong>
            </div>
            <div className="onboarding-device-row">
              <span>Bağlama durumu</span>
              <strong>{bootstrap.access.installation.bindingStatus}</strong>
            </div>
            <code className="onboarding-path">
              {bootstrap.access.installation.sharedBindingPath}
            </code>
          </div>

          <div className="onboarding-mascot-card">
            <img alt="Domizan maskotu" className="onboarding-mascot" src={domizanMascotUrl} />
            <p>Kurulum tamamlandığında uygulama doğrudan operasyon ekranına geçecek.</p>
          </div>
        </section>

        <section className="onboarding-panel">
          {feedback && (
            <div className={feedback.type === "error" ? "inline-error" : "inline-success"}>
              {feedback.message}
            </div>
          )}

          {currentStep === "welcome" && (
            <div className="onboarding-card-stack">
              <article className="onboarding-card">
                <p className="eyebrow">Hazırlık</p>
                <h2>Kurulum birkaç dakikada tamamlanır.</h2>
                <p>
                  Önce ofis bilgilerini kaydedelim. Ardından bu kurulum için 7 günlük denemeyi
                  başlatabilir veya mevcut lisansı etkinleştirebilirsin.
                </p>

                <div className="onboarding-list">
                  <div className="onboarding-list-item">
                    <BadgeCheck size={16} />
                    <span>Masaüstünde Domizan klasör yapısı korunur.</span>
                  </div>
                  <div className="onboarding-list-item">
                    <BadgeCheck size={16} />
                    <span>Deneme ve lisans aynı makinede tek kurulum olarak izlenir.</span>
                  </div>
                  <div className="onboarding-list-item">
                    <BadgeCheck size={16} />
                    <span>Telegram yalnızca mali müşavire özel bilgi kanalı olarak kalır.</span>
                  </div>
                </div>

                <div className="onboarding-actions">
                  <button className="primary-button" onClick={() => setSetupStep("workspace")} type="button">
                    <ArrowRight size={16} />
                    <span>Kuruluma başla</span>
                  </button>
                </div>
              </article>
            </div>
          )}

          {currentStep === "workspace" && (
            <div className="onboarding-card-stack">
              <article className="onboarding-card">
                <p className="eyebrow">Ofis Bilgileri</p>
                <h2>Kurulumu ofisin adına bağlayalım.</h2>
                <p>
                  Bu bilgiler deneme, lisans ve ileride Lemon satın alma akışı için temel profil
                  olarak kullanılacak.
                </p>

                <div className="field-grid">
                  <label className="field">
                    <span>Ofis adı</span>
                    <input
                      onChange={(event) =>
                        setSetupForm((current) => ({ ...current, officeName: event.target.value }))
                      }
                      placeholder="Örn. Demir Mali Müşavirlik"
                      value={setupForm.officeName}
                    />
                  </label>

                  <label className="field">
                    <span>Yetkili adı</span>
                    <input
                      onChange={(event) =>
                        setSetupForm((current) => ({ ...current, ownerName: event.target.value }))
                      }
                      placeholder="Örn. Ahmet Demir"
                      value={setupForm.ownerName}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Yetkili e-posta</span>
                  <input
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, ownerEmail: event.target.value }))
                    }
                    placeholder="ornek@ofis.com"
                    type="email"
                    value={setupForm.ownerEmail}
                  />
                </label>

                <div className="onboarding-actions">
                  <button className="secondary-button" onClick={() => setSetupStep("welcome")} type="button">
                    Geri dön
                  </button>
                  <button
                    className="primary-button"
                    disabled={busyAction === "workspace"}
                    onClick={handleWorkspaceSubmit}
                    type="button"
                  >
                    <ArrowRight size={16} />
                    <span>{busyAction === "workspace" ? "Kaydediliyor" : "Bilgileri kaydet"}</span>
                  </button>
                </div>
              </article>
            </div>
          )}

          {currentStep === "access" && (
            <div className="onboarding-card-stack">
              <article className="onboarding-card">
                <p className="eyebrow">Erişim</p>
                <h2>{accessTitle}</h2>
                <p>{accessDescription}</p>

                <div className="onboarding-access-grid">
                  <div className="onboarding-access-box">
                    <Clock3 size={18} />
                    <div>
                      <strong>Deneme durumu</strong>
                      <p>
                        {bootstrap.access.trial.status === "active"
                          ? `${bootstrap.access.trial.daysLeft} gün kaldı`
                          : bootstrap.access.trial.status === "expired"
                            ? "Süre doldu"
                            : bootstrap.access.trial.status === "converted"
                              ? "Lisansa çevrildi"
                              : "Henüz başlamadı"}
                      </p>
                    </div>
                  </div>

                  <div className="onboarding-access-box">
                    <LockKeyhole size={18} />
                    <div>
                      <strong>Makine koruması</strong>
                      <p>Bu kurulum başka cihaza taşınırsa erişim otomatik kilitlenir.</p>
                    </div>
                  </div>
                </div>

                {bootstrap.access.reason && (
                  <div className="import-warning-box">
                    <Shield size={18} />
                    <span>{bootstrap.access.reason}</span>
                  </div>
                )}

                <div className="onboarding-actions">
                  <button
                    className="primary-button"
                    disabled={!bootstrap.access.canStartTrial || busyAction === "trial"}
                    onClick={handleStartTrial}
                    type="button"
                  >
                    <Clock3 size={16} />
                    <span>{busyAction === "trial" ? "Başlatılıyor" : "7 günlük denemeyi başlat"}</span>
                  </button>
                  <button
                    className="secondary-button"
                    disabled={checkoutDisabled || busyAction === "checkout"}
                    onClick={handleCheckout}
                    type="button"
                  >
                    <Sparkles size={16} />
                    <span>{busyAction === "checkout" ? "Açılıyor" : "Satın alma sayfasını aç"}</span>
                  </button>
                </div>

                {checkoutDisabled && (
                  <p className="onboarding-footnote">
                    Lemon test mode bilgileri girildiğinde satın alma düğmesi aktif olacak.
                  </p>
                )}
              </article>

              <article className="onboarding-card">
                <p className="eyebrow">Lisans Anahtarı</p>
                <h2>Mevcut lisansın varsa doğrudan etkinleştir.</h2>
                <p>
                  Lisans bu kurulum kimliği ve makine bağlama kaydı ile birlikte tutulur. Aynı anahtar
                  kopyalanmış kurulumlarda ayrı bir deneme başlatmak için kullanılamaz.
                </p>

                <label className="field">
                  <span>Lisans anahtarı</span>
                  <input
                    onChange={(event) =>
                      setLicenseForm((current) => ({ ...current, licenseKey: event.target.value }))
                    }
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={licenseForm.licenseKey}
                  />
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>Sipariş e-postası</span>
                    <input
                      onChange={(event) =>
                        setLicenseForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="ornek@ofis.com"
                      type="email"
                      value={licenseForm.email ?? ""}
                    />
                  </label>

                  <label className="field">
                    <span>İsteğe bağlı kurulum etiketi</span>
                    <input
                      onChange={(event) =>
                        setLicenseForm((current) => ({ ...current, instanceName: event.target.value }))
                      }
                      placeholder={`${bootstrap.access.installation.deviceLabel} masaüstü`}
                      value={licenseForm.instanceName ?? ""}
                    />
                  </label>
                </div>

                <div className="onboarding-actions">
                  <button
                    className="primary-button"
                    disabled={!licenseForm.licenseKey.trim() || busyAction === "license"}
                    onClick={handleActivateLicense}
                    type="button"
                  >
                    <KeyRound size={16} />
                    <span>{busyAction === "license" ? "Etkinleştiriliyor" : "Lisansı etkinleştir"}</span>
                  </button>

                  <button
                    className="secondary-button"
                    disabled={!bootstrap.access.license || busyAction === "validate"}
                    onClick={handleValidateLicense}
                    type="button"
                  >
                    <Mail size={16} />
                    <span>{busyAction === "validate" ? "Doğrulanıyor" : "Kayıtlı lisansı doğrula"}</span>
                  </button>
                </div>

                {bootstrap.access.license && (
                  <div className="onboarding-license-meta">
                    <div>
                      <span>Durum</span>
                      <strong>{bootstrap.access.license.licenseStatus}</strong>
                    </div>
                    <div>
                      <span>Etkinleştirildi</span>
                      <strong>{formatDateTime(bootstrap.access.license.activatedAt)}</strong>
                    </div>
                    <div>
                      <span>Son doğrulama</span>
                      <strong>{formatDateTime(bootstrap.access.license.validatedAt)}</strong>
                    </div>
                  </div>
                )}
              </article>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
