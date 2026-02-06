import React, { useState, useRef } from 'react';
import { 
  Text, View, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal,
  Animated, Pressable 
} from 'react-native';
import { useRouter } from 'expo-router'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getAuthStyles } from '../styles/authStyles';

const ScaleButton = ({ onPress, style, children, wrapperStyle, ...props }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
      if (props.disabled) return;
      Animated.spring(scaleValue, {
          toValue: 0.96, // Slight shrink effect
          useNativeDriver: true,
          speed: 50,
          bounciness: 10,
      }).start();
  };

  const onPressOut = () => {
      Animated.spring(scaleValue, {
          toValue: 1, 
          useNativeDriver: true,
          speed: 50,
          bounciness: 10,
      }).start();
  };

  return (
      <Pressable 
          onPress={onPress} 
          onPressIn={onPressIn} 
          onPressOut={onPressOut}
          style={wrapperStyle} // Layout styles (width, margin) go here
          {...props} 
      >
          <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
              {children}
          </Animated.View>
      </Pressable>
  );
};

export default function RegisterScreen() {
  const { colors, isDark } = useTheme();
  const authStyles = getAuthStyles(colors);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  // --- SMS SYSTEM STATES ---
  const [confirm, setConfirm] = useState(null); 
  const [verificationCode, setVerificationCode] = useState(''); 
  const [modalVisible, setModalVisible] = useState(false); 
  
  // --- AGREEMENT STATES ---
  const [isAgreed, setIsAgreed] = useState(false); 
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  const router = useRouter();

  const handleEmailChange = (text) => {
    setEmail(text);
    const emailRegex = /^.+@.+\.com$/;
    setIsEmailValid(text.length === 0 || emailRegex.test(text));
  };

  const handlePhoneChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 10) {
      setPhoneNumber(numericText);
      setIsPhoneValid(numericText.length === 0 || numericText.length === 10);
    }
  };

  // --- STEP 1: SEND CODE (REGISTER) ---
  const handleRegisterPress = async () => {
    // Validate inputs
    if (!username || !email || !phoneNumber) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (emailError || phoneError) {
      Alert.alert('Hata', 'Lütfen hatalı alanları düzeltin.');
      return;
    }

    setLoading(true);
    try {
      // Send code to EMAIL via Backend
      const response = await fetch(`${API_URL}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'register' }),
      });
      const data = await response.json();

      if (response.ok) {
        setModalVisible(true); // Open existing Modal
      } else {
        Alert.alert('Hata', data.error || 'Kod gönderilemedi.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Sunucu hatası.');
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: VERIFY & CREATE ACCOUNT ---
  const handleVerifyAndCreate = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Hata', 'Lütfen 6 haneli kodu girin.');
      return;
    }

    setRegistering(true);
    try {
      // Call updated verify endpoint (No password)
      const response = await fetch(`${API_URL}/verify-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode,
          username: username.trim(),
          phone_number: phoneNumber.trim()
        }),
      });
      const data = await response.json();

      if (response.ok) {
        // Auto Login
        if (data.user_id) await AsyncStorage.setItem('user_id', data.user_id.toString());
        
        setModalVisible(false);
        Alert.alert("Başarılı", "Hesabınız oluşturuldu!", [
            { text: "Tamam", onPress: () => router.replace({ pathname: '/home', params: { userId: data.user_id } }) }
        ]);
      } else {
        Alert.alert('Hata', data.error || 'Doğrulama başarısız.');
      }
    } catch (error) {
      Alert.alert('Hata', 'İşlem tamamlanamadı.');
    } finally {
      setRegistering(false);
    }
  };

  // --- VALIDATION ---
  const isRegisterEnabled = 
    username.length > 0 && 
    email.length > 0 && isEmailValid && 
    phoneNumber.length === 10 &&
    isAgreed;

  return (
    // CHANGE: Added LinearGradient as the main wrapper matching Home screen
    <LinearGradient
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={authStyles.container}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} // Changed from authStyles.container to flex:1 to show gradient
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={authStyles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={authStyles.title}>Aramıza Katıl</Text>
          
          <View style={authStyles.inputContainer}>
            <TextInput
              style={authStyles.input}
              placeholder="Kullanıcı Adı"
              placeholderTextColor={isDark ? '#545454' : '#666'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              selectionColor={isDark ? '#545454' : '#666'}
            />

            <TextInput
              style={authStyles.input}
              placeholder="E-posta Adresi"
              placeholderTextColor={isDark ? '#545454' : '#666'}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor={isDark ? '#545454' : '#666'}
            />
            {!isEmailValid && (
               <Text style={authStyles.errorText}>Geçerli bir e-posta girin (.com)</Text>
            )}

            <View style={authStyles.phoneContainer}>
               <Text style={authStyles.phonePrefix}>+90</Text>
               <TextInput
                  style={authStyles.phoneInput}
                  placeholder="Telefon Numarası (555...)"
                  placeholderTextColor={isDark ? '#545454' : '#666'}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  keyboardType="number-pad"
                  maxLength={10} 
                  selectionColor={isDark ? '#545454' : '#666'}
               />
            </View>
            {!isPhoneValid && (
               <Text style={authStyles.errorText}>Lütfen geçerli bir telefon numarası girin</Text>
            )}
          </View>

          {/* --- CHECKBOX AREA --- */}
          <View style={authStyles.checkboxContainer}>
            <ScaleButton onPress={() => setIsAgreed(!isAgreed)}>
              <View style={[authStyles.checkbox, isAgreed && authStyles.checkboxSelected]}>
                {isAgreed && <Ionicons name="checkmark" size={18} color={isAgreed ? (isDark ? '#000' : '#fff') : colors.textSecondary} />}
              </View>
            </ScaleButton>

              <View style={authStyles.checkboxTextContainer}>
                  <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                      <Text style={authStyles.checkboxLink}>Kullanıcı Sözleşmesini</Text>
                  </TouchableOpacity>
                  <Text style={authStyles.checkboxLabel}> ve </Text>
                  <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
                      <Text style={authStyles.checkboxLink}>Gizlilik Politikasını</Text>
                  </TouchableOpacity>
                  <Text style={authStyles.checkboxLabel}> okudum, onaylıyorum.</Text>
              </View>
          </View>

          <ScaleButton 
              style={[authStyles.button, (!isRegisterEnabled || loading) && authStyles.buttonDisabled]} 
              onPress={handleRegisterPress} 
              disabled={!isRegisterEnabled || loading}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? '#ffffff' : '#000000'} />
            ) : (
              <Text style={authStyles.buttonText}>Kayıt Ol</Text>
            )}
          </ScaleButton>

          <TouchableOpacity onPress={() => router.back()} style={authStyles.linkContainer}>
            <Text style={authStyles.linkText}>Zaten hesabın var mı? Giriş Yap</Text>
          </TouchableOpacity>

          {/* --- CODE MODAL --- */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => { setModalVisible(!modalVisible); setLoading(false); }}
          >
            <View style={authStyles.modalOverlay}>
              <View style={authStyles.modalContainer}>
                <Text style={authStyles.modalTitle}>Doğrulama Kodu</Text>
                <Text style={authStyles.modalSubtitle}>{email} adresine gönderilen kodu girin.</Text>
                <TextInput
                  style={authStyles.modalInput}
                  placeholder="------"
                  placeholderTextColor={isDark ? '#545454' : '#666'} // Darker placeholder for better contrast on light modal input
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                  selectionColor={isDark ? '#545454' : '#666'}
                />
                <ScaleButton style={authStyles.modalButton} onPress={handleVerifyAndCreate} disabled={loading}>
                   {loading ? <ActivityIndicator color={isDark ? '#000' : '#fff'}/> : <Text style={{ color: isDark ? '#000' : '#fff', fontSize: 18, fontWeight: '600' }}>Doğrula ve Tamamla</Text>}
                </ScaleButton>
                <TouchableOpacity style={authStyles.modalCancelButton} onPress={() => { setModalVisible(false); setLoading(false); }}>
                  <Text style={authStyles.modalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* --- TERMS OF SERVICE MODAL --- */}
          <Modal visible={showTermsModal} animationType="slide" transparent={true} onRequestClose={() => setShowTermsModal(false)}>
              <View style={authStyles.docModalContainer}>
                  <View style={authStyles.docModalContent}>
                      <Text style={authStyles.docModalTitle}>Kullanıcı Sözleşmesi</Text>
                      <ScrollView style={authStyles.docScrollView}>
                          <Text style={authStyles.docText}>{termsOfServiceText}</Text>
                      </ScrollView>
                      <ScaleButton style={authStyles.docCloseButton} onPress={() => setShowTermsModal(false)}>
                          <Text style={{ color: isDark ? '#000' : '#fff', fontSize: 18, fontWeight: '600' }}>Kapat</Text>
                      </ScaleButton>
                  </View>
              </View>
          </Modal>

          {/* --- PRIVACY POLICY MODAL --- */}
          <Modal visible={showPrivacyModal} animationType="slide" transparent={true} onRequestClose={() => setShowPrivacyModal(false)}>
              <View style={authStyles.docModalContainer}>
                  <View style={authStyles.docModalContent}>
                      <Text style={authStyles.docModalTitle}>Gizlilik Politikası</Text>
                      <ScrollView style={authStyles.docScrollView}>
                          <Text style={authStyles.docText}>{privacyPolicyText}</Text>
                      </ScrollView>
                      <TouchableOpacity style={authStyles.docCloseButton} onPress={() => setShowPrivacyModal(false)}>
                          <Text style={{ color: isDark ? '#000' : '#fff', fontSize: 18, fontWeight: '600' }}>Kapat</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </Modal>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}


const privacyPolicyText = `GİZLİLİK POLİTİKASI
Son Güncelleme: 04/02/2026 

1. Amaç
Bu Gizlilik Politikası, Uygulama'yı kullanan Kullanıcıların kişisel verilerinin hangi amaçlarla
işlendiğini, nasıl korunduğunu ve Kullanıcıların haklarını açıklar.

2. Toplanan Veriler
Uygulama kapsamında aşağıdaki veri kategorileri işlenebilir:
• Kimlik İletişim: Telefon numarası (SMS doğrulama için), kullanıcı adı, profil bilgileri.
• Hesap ve Plan Bilgileri: Free/Pro plan durumu, günlük upload limitleri ve kullanım
sayaçları.
• Grup Verileri: Grup üyelikleri, rol bilgisi (Admin), katılım istekleri.
• Medya İçeriği: Yüklenen fotoğraf ve videolar, içerik metadata'ları (tarih/saat, uplo-
ader bilgisi).
• Moderasyon Verileri: Report kayıtları, Admin Panel işlem kayıtları (yoksay/sil/ban).
• Teknik Veriler: Hata kayıtları, performans/metrik bilgileri (uygulamanın sağlıklı
çalışması için).

3. Verilerin İşlenme Amaçları
Kişisel veriler aşağıdaki amaçlarla işlenir:
• Telefon numarası ile SMS doğrulama yaparak tekil hesap politikasını sağlamak,
• Grup oluşturma/katılma ve ortak galeri fonksiyonlarını sunmak,
• Plan yönetimi ve günlük upload limitlerini uygulamak,
• Report ve moderasyon süreçlerini yürütmek, güvenliği artırmak,
• Push notification ile bilgilendirme sağlamak (katılma isteği, medya yükleme vb.),
• Uygulama güvenliği, hata ayıklama ve hizmet kalitesini artırmak.

4. Verilerin Paylaşımı
• Kullanıcı verileri üçüncü taraflarla satılmaz.
• Yalnızca hizmetin çalışması için zorunlu teknik sağlayıcılar (örn. SMS sağlayıcısı,
bildirim altyapısı, barındırma/depoma) kapsamında sınırlı paylaşım olabilir.
• Yasal zorunluluk halinde, yetkili kamu kurumlarıyla paylaşım yapılabilir.

5. Medya İçerikleri ve Erişim Kontrolleri
• Medya içerikleri yalnızca ilgili grup üyeleri tarafından görüntülenebilir.
• Kullanıcılar diğer kullanıcıları engelleyebilir. Engelleme durumunda taraflar birbirlerinin
medyalarına erişemez.
• Report edilen içerikler, yalnızca moderasyon amacıyla Admin Panel üzerinden yetkili
kişilerce incelenir.

6. Veri Güvenliği
Sağlayıcı, kişisel verilerin korunması için makul teknik ve idari tedbirleri uygular. Bununla bir-
likte internet ortamında %100 güvenlik garanti edilemez. Kullanıcı, kendi cihaz güvenliğinden
(şifre, ekran kilidi, işletim sistemi güncelliği vb.) de sorumludur.

7. Saklama Süresi
Veriler, hizmetin sunulması için gerekli süre boyunca ve ilgili mevzuatta öngörülen süreler
çerçevesinde saklanır.

8. Hesap Silme ve Verilerin Silinmesi
• Kullanıcı hesabını sildiğinde; kişisel veriler ve içerikler sistemden tamamen silinir.
• Yasal yükümlülük nedeniyle tutulması gereken kayıtlar (varsa) mevzuatın izin verdiği
ölçüde ve süre boyunca saklanabilir.

9. Kullanıcı Hakları
Kullanıcılar; verilerine erişme, düzeltme, silme, işleme itiraz etme gibi haklarını ilgili mevzuat
kapsamında kullanabilir. Talepler için iletişim: help@wmory.com

10. Politika Değişiklikleri
Bu politika güncellenebilir. Güncellemeler Uygulama içinde yayınlandığı tarihten itibaren
geçerlidir.

Kabul Beyanı: Kayıt sırasında "Gizlilik Politikası"nı okuduğumu ve kabul ettiğimi onaylarım.`;

const termsOfServiceText = `KULLANICI SÖZLEŞMESİ
Son Güncelleme: 27/12/2025

1. Taraflar ve Kapsam
İşbu Kullanıcı Sözleşmesi ("Sözleşme"), uygulamayı ("Uygulama") kullanan kullanıcı ("Kulla-
nıcı") ile Uygulama'nın sahibi ve işletmecisi ("Sağlayıcı") arasında, Uygulama'nın kullanım
koşullarını düzenler. Uygulama'ya kayıt olarak veya Uygulama'yı kullanarak bu Sözleşme'yi
kabul etmiş sayılırsınız.

2. Uygulamanın Amacı
Uygulama; kullanıcıların grup oluşturarak veya gruplara katılarak fotoğraf ve videoları "ortak
galeri" mantığıyla paylaşmasını sağlar. Paylaşılan medya içerikleri, ilgili gruptaki yetkili
kullanıcılar tarafından görüntülenir.

3. Hesap Oluşturma ve Telefon Doğrulama
• Uygulama'da hesap oluşturabilmek için telefon numarası ile SMS doğrulaması zorunlu-
dur.
• Kullanıcı, kendisine ait ve kontrol ettiği telefon numarasıyla kayıt olmayı kabul eder.
• Bir telefon numarası ile birden fazla hesap açılmasına izin verilmez (tekil hesap politi-
kası).
• Kullanıcı, hesap bilgilerinin doğruluğundan ve güncelliğinden sorumludur.

4. Grup Yönetimi ve Yetkilendirme
• Her grubun tek bir yönetici ("Admin") hesabı bulunur.
• Grup kodu ile gruba katılma talebi oluşturulur; katılım, yalnızca Admin onayıyla
gerçekleşir.
• Admin, gruba katılımları açabilir/kapatabilir; kullanıcıları kabul edebilir/reddedebilir;
kullanıcıları gruptan çıkarabilir.
• Admin, yönetici yetkisini başka bir kullanıcıya devredebilir; bu durumda mevcut Admin
yetkisini kaybeder.
• Admin gruptan ayrılırsa, grupta belirlenen kurala göre (ör. ilk giren kullanıcı) yeni
Admin atanabilir.

5. Planlar, Kullanım Limitleri ve Ücretlendirme
Uygulama'da planlar ve günlük yükleme limitleri aşağıdaki şekilde sunulur:
• Free Plan: Günlük en fazla 10 fotoğraf ve 2 video yükleme.
• Pro Plan: Günlük en fazla 50 fotoğraf ve 5 video yükleme.
Plan içerikleri, limitler ve fiyatlandırma Uygulama içinde ayrıca gösterilebilir ve güncellenebilir.
Kullanıcı, güncel plan koşullarını Uygulama içinden takip etmekle yükümlüdür.

6. İçerik Paylaşımı ve Sorumluluk
• Kullanıcı yalnızca kendisine ait veya paylaşım hakkına sahip olduğu içerikleri yüklemeyi
kabul eder.
• Yasa dışı, hak ihlali oluşturan, nefret söylemi içeren, taciz/şiddet içeren, cinsel içerik,
özel hayatın gizliliğini ihlal eden veya üçüncü kişilerin haklarını zedeleyen içerikler
kesinlikle yasaktır.
• İçeriklerin hukuki sorumluluğu içeriği yükleyen kullanıcıya aittir.

7. Bildirme (Report) ve Moderasyon
• Kullanıcılar, uygunsuz buldukları medya içeriklerini "Report" ederek bildirebilir.
• Bildirilen içerikler Admin Panel üzerinden Sağlayıcı tarafından incelenebilir.
• İnceleme sonucunda Sağlayıcı; (i) bildirimi yoksayabilir, (ii) içeriği silebilir, (iii)
kullanıcıyı sistemden yasaklayabilir (ban) veya gerekli görülen diğer önlemleri alabilir.
• Sağlayıcı, topluluk güvenliği ve hukuki yükümlülükler kapsamında gerektiğinde içeriklere
müdahale etme hakkını saklı tutar.

8. Bildirimler (Notifications)
Uygulama; gruba katılma isteği ve medya yüklenmesi gibi olaylarda push notification gön-
derebilir. Kullanıcı, cihaz bildirim ayarlarını kendi tercihine göre yönetebilir. Bildirimlerin
gecikmesi veya bazı cihazlarda kısıtlanması Kullanıcı'nın cihaz/işletim sistemi ayarlarından
kaynaklanabilir.

9. Hesap Silme ve Sonlandırma
• Kullanıcı dilediği zaman hesabını silebilir.
• Hesap silindiğinde, Kullanıcı'nın kişisel verileri ve içerikleri sistemden tamamen
silinir (Sağlayıcı tarafından tutulması zorunlu yasal kayıtlar hariç).
• Sözleşme ihlali halinde Sağlayıcı, kullanıcı hesabını geçici veya kalıcı olarak askıya
alabilir/sonlandırabilir.

10. Hizmet Kesintileri ve Sorumluluğun Sınırlandırılması
Uygulama "olduğu gibi" sunulur. Bakım, güncelleme, ağ sorunları, cihaz kaynaklı problemler
veya üçüncü taraf servis kesintileri nedeniyle erişimde aksaklıklar yaşanabilir. Sağlayıcı, makul
çaba göstermekle birlikte kesintisiz hizmet garantisi vermez.

11. Sözleşme Değişiklikleri
Sağlayıcı, bu Sözleşme'yi güncelleyebilir. Güncellemeler Uygulama üzerinden yayınlandığı
tarihten itibaren geçerli olur.

12. İletişim
Sözleşme ile ilgili talepler için: help@wmory.com

Kabul Beyanı: Kayıt sırasında "Kullanıcı Sözleşmesi'ni okuduğumu ve kabul ettiğimi onay-
larım. `;