import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Modal, Image, Alert, 
  ActivityIndicator, StatusBar, TouchableWithoutFeedback, ScrollView, TextInput, KeyboardAvoidingView, Platform, PanResponder, Dimensions,
  Animated, Pressable
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av'; 
import API_URL from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getAdminPanelStyles } from '../styles/adminPanelStyles';

// --- HELPER COMPONENT: ANIMATED SCALE BUTTON ---
const ScaleButton = ({ onPress, style, children, wrapperStyle, ...props }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;
  
    const onPressIn = () => {
        if (props.disabled) return;
        Animated.spring(scaleValue, {
            toValue: 0.96,
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
            style={wrapperStyle}
            {...props} 
        >
            <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

export default function AdminPanel() {
    // --- THEME HOOK ---
  const { colors, isDark } = useTheme();
  const adminPanelStyles = getAdminPanelStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUserId = params.userId;

  const { width } = Dimensions.get('window'); // Ekran genişliği

  // --- iOS SWIPE BACK (Right to Left) ---
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          Platform.OS === 'ios' && 
          gestureState.moveX > (width - 50) && 
          gestureState.dx < -10                
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          router.back();
        }
      },
    })
  ).current;

  // --- 2FA STATES () ---
  const [isVerified, setIsVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [initLoading, setInitLoading] = useState(true);

  // --- EXISTING STATES ---
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // States for Manual Ban
  const [manualBanId, setManualBanId] = useState('');
  const [manualBanPhone, setManualBanPhone] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [banModalVisible, setBanModalVisible] = useState(false);
  const [selectedBannedUser, setSelectedBannedUser] = useState(null);

  // --- 2FA INITIATION (Sayfa Yüklenince) ---
  useEffect(() => {
    if (currentUserId) {
        initiate2FA();
    }
  }, [currentUserId]);

  const initiate2FA = async () => {
      setInitLoading(true);
      try {
          const response = await fetch(`${API_URL}/admin/initiate-2fa`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ admin_id: currentUserId })
          });
          const data = await response.json();
          if (response.ok) {
              // E-postayı maskeleyerek göster (örn: mus****@gmail.com)
              setUserEmail(data.email); 
          } else {
              Alert.alert("Hata", data.error || "Kod gönderilemedi. Lütfen tekrar deneyin.", [
                  { text: "Geri Dön", onPress: () => router.back() }
              ]);
          }
      } catch (e) {
          Alert.alert("Bağlantı Hatası", "Sunucuya erişilemedi.", [{ text: "Geri Dön", onPress: () => router.back() }]);
      } finally {
          setInitLoading(false);
      }
  };

  const handleVerifyCode = async () => {
      if (!verificationCode || verificationCode.length < 6) {
          Alert.alert("Hata", "Lütfen 6 haneli kodu girin.");
          return;
      }
      setVerifying(true);
      try {
          const response = await fetch(`${API_URL}/admin/verify-2fa`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ admin_id: currentUserId, code: verificationCode })
          });
          if (response.ok) {
              setIsVerified(true); // GİRİŞ BAŞARILI
              // Verileri çekmeye başla
              if (activeTab === 'reports') fetchReports();
              else if (activeTab === 'banned') fetchBannedUsers();
          } else {
              const data = await response.json();
              Alert.alert("Hata", data.error || "Doğrulama başarısız.");
          }
      } catch (e) {
          Alert.alert("Hata", "Sunucu hatası.");
      } finally {
          setVerifying(false);
      }
  };

  const handleResendCode = () => {
      setVerificationCode('');
      initiate2FA();
      Alert.alert("Bilgi", "Kod yeniden gönderiliyor...");
  };

  // --- EXISTING EFFECT FOR TABS ---
  // Sadece isVerified True ise çalışır
  useEffect(() => {
    if(currentUserId && isVerified) {
        if (activeTab === 'reports') fetchReports();
        else if (activeTab === 'banned') fetchBannedUsers();
    }
  }, [activeTab, isVerified]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/get-reports?admin_id=${currentUserId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }});
      const data = await response.json();
      if (response.ok) setReports(data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const fetchBannedUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/get-banned-users?admin_id=${currentUserId}`, { headers: { 'ngrok-skip-browser-warning': 'true' }});
      const data = await response.json();
      if (response.ok) setBannedUsers(data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleResolveReport = async (action) => {
      if (!selectedReport) return;
      if (action === 'ban_user') {
          Alert.alert("DİKKAT", "Kullanıcı tamamen silinecek ve numarası engellenecek. Emin misiniz?", [
              { text: "İptal", style: "cancel" },
              { text: "BANLA VE SİL", style: 'destructive', onPress: () => executeReportAction(action) }
          ]);
      } else {
          executeReportAction(action);
      }
  };

  const executeReportAction = async (action) => {
    try {
        const res = await fetch(`${API_URL}/admin/resolve-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({
                admin_id: currentUserId,
                report_id: selectedReport.report_id,
                action: action
            })
        });
        if (res.ok) {
            setReportModalVisible(false);
            fetchReports();
            Alert.alert("Başarılı", "İşlem tamamlandı.");
        } else {
            Alert.alert("Hata", "İşlem başarısız.");
        }
    } catch (e) { console.error(e); }
  };

  const handleUnbanUser = async () => {
      if (!selectedBannedUser) return;
      try {
          const res = await fetch(`${API_URL}/admin/unban-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({
                  admin_id: currentUserId,
                  banned_id: selectedBannedUser.id
              })
          });
          if (res.ok) {
              setBanModalVisible(false);
              fetchBannedUsers();
              Alert.alert("Başarılı", "Kullanıcının banı kaldırıldı.");
          }
      } catch (e) { console.error(e); }
  };

  const handleManualBan = async () => {
      if (!manualBanId && !manualBanPhone) {
          Alert.alert("Hata", "Lütfen ID veya Telefon numarası girin.");
          return;
      }
      setManualLoading(true);
      try {
          const res = await fetch(`${API_URL}/admin/manual-ban`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({
                  admin_id: currentUserId,
                  target_id: manualBanId,
                  phone: manualBanPhone
              })
          });
          const data = await res.json();
          if (res.ok) {
              Alert.alert("Başarılı", "Kullanıcı banlandı ve silindi.");
              setManualBanId('');
              setManualBanPhone('');
          } else {
              Alert.alert("Hata", data.error || "İşlem başarısız.");
          }
      } catch (e) { console.error(e); }
      finally { setManualLoading(false); }
  };

  const renderReportItem = ({ item }) => (
    <ScaleButton style={adminPanelStyles.row} onPress={() => { setSelectedReport(item); setReportModalVisible(true); }}>
        <Ionicons name="alert-circle" size={24} color="#FF9500" style={{ marginRight: 10 }} />
        <View style={adminPanelStyles.rowInfo}>
            <Text style={adminPanelStyles.mainText} numberOfLines={1}>{item.reason}</Text>
            <Text style={adminPanelStyles.subText}>Raporlayan: {item.reporter_username}</Text>
            <Text style={[adminPanelStyles.subText, {color: 'red'}]}>Şüpheli: {item.uploader_username}</Text>
        </View>
        {/* Dynamic Chevron */}
        <Ionicons name="chevron-forward" size={20} color={isDark ? "#ccc" : "#000"} />
    </ScaleButton>
  );

  const renderBannedUserItem = ({ item }) => (
    <ScaleButton style={adminPanelStyles.row} onPress={() => { setSelectedBannedUser(item); setBanModalVisible(true); }}>
        <Ionicons name="ban" size={24} color="#FF3B30" style={{ marginRight: 10 }} />
        <View style={adminPanelStyles.rowInfo}>
            <Text style={adminPanelStyles.mainText}>{item.username || "Bilinmeyen Kullanıcı"}</Text>
            <Text style={adminPanelStyles.subText}>Tarih: {new Date(item.banned_at).toLocaleDateString()}</Text>
        </View>
        {/* Dynamic Chevron */}
        <Ionicons name="chevron-forward" size={20} color={isDark ? "#ccc" : "#000"} />
    </ScaleButton>
  );

  // --- 2FA INTERCEPTION SCREEN ---
  if (!isVerified) {
      return (
        <LinearGradient 
            colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
            style={adminPanelStyles.container}
        >
            <StatusBar 
                // Match Header Color
                backgroundColor={isDark ? '#1a1a1a' : '#808080'} 
                barStyle={isDark ? "light-content" : "dark-content"} 
            />

            {Platform.OS === 'ios' && (
                <View
                    {...panResponder.panHandlers}
                    style={{
                        position: 'absolute',
                        right: 0,   // SAĞA YAPIŞIK
                        top: 0,
                        bottom: 0,
                        width: 50,  // Dokunma alanı genişliği
                        zIndex: 9999, 
                        backgroundColor: 'transparent'
                    }}
                />
            )}
            
            {/* Header */}
            <View style={adminPanelStyles.headerContainer}>
                <TouchableOpacity style={adminPanelStyles.backButton} onPress={() => router.back()}>
                    {/* Always White Icon */}
                    <Ionicons name="chevron-back" size={32} color="#ffffff" />
                </TouchableOpacity>
                <Text style={adminPanelStyles.headerTitle}>Güvenlik Kontrolü</Text>
                <View style={{width:40}} /> 
            </View>

            {initLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {/* Dynamic Spinner */}
                    <ActivityIndicator size="large" color={colors.textPrimary} />
                    <Text style={{ marginTop: 20, color: colors.textSecondary }}>Kod oluşturuluyor...</Text>
                </View>
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={adminPanelStyles.authContainer}>
                    <Ionicons name="shield-checkmark" size={80} color={colors.textPrimary} style={{ marginBottom: 20 }} />
                    <Text style={adminPanelStyles.authTitle}>Kimlik Doğrulama</Text>
                    <Text style={adminPanelStyles.authDesc}>
                        Lütfen {userEmail ? <Text style={{fontWeight:'bold'}}>{userEmail}</Text> : "mail"} adresinize gönderilen 6 haneli kodu giriniz.
                    </Text>

                    <TextInput 
                        style={adminPanelStyles.authInput}
                        placeholder="Kod (Örn: 123456)"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        maxLength={6}
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        autoFocus
                        selectionColor={colors.textPrimary}
                    />

                    <ScaleButton style={adminPanelStyles.authButton} onPress={handleVerifyCode} disabled={verifying}>
                        {verifying ? <ActivityIndicator color="#fff" /> : <Text style={adminPanelStyles.authButtonText}>Onayla</Text>}
                    </ScaleButton>

                    <TouchableOpacity style={{ marginTop: 20 }} onPress={handleResendCode}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Kodu Yeniden Gönder</Text>
                    </TouchableOpacity> 
                </KeyboardAvoidingView>
            )}
        </LinearGradient>
      );
  }

  // --- MAIN ADMIN PANEL CONTENT ---
  return (
    <LinearGradient 
      colors={isDark ? ['#4e4e4e', '#1a1a1a'] : ['#ffffff', '#d3d3d3']} 
      style={adminPanelStyles.container}
    >
      <StatusBar 
        backgroundColor={isDark ? '#1a1a1a' : '#808080'} 
        barStyle={isDark ? "light-content" : "dark-content"} 
      />

      {Platform.OS === 'ios' && (
        <View
          {...panResponder.panHandlers}
          style={{
            position: 'absolute',
            right: 0,   
            top: 0,
            bottom: 0,
            width: 50,  
            zIndex: 9999, 
            backgroundColor: 'transparent'
          }}
        />
      )}
      
      {/* Header */}
      <View style={adminPanelStyles.headerContainer}>
          <TouchableOpacity style={adminPanelStyles.backButton} onPress={() => router.back()}>
              {/* Always White Icon */}
              <Ionicons name="chevron-back" size={32} color="#ffffff" />
          </TouchableOpacity>
          <Text style={adminPanelStyles.headerTitle}>Admin Sayfası</Text>
          <View style={{width: 32}} />
      </View>

      {/* Tabs */}
      <View style={adminPanelStyles.tabContainer}>
          {['reports', 'banned', 'manual_ban'].map(tabKey => (
              <TouchableOpacity 
                key={tabKey}
                style={[adminPanelStyles.tabButton, activeTab === tabKey && adminPanelStyles.activeTab]}
                onPress={() => setActiveTab(tabKey)}
              >
                  <Text style={[adminPanelStyles.tabText, activeTab === tabKey && adminPanelStyles.activeTabText]}>
                      {tabKey === 'reports' ? 'Raporlar' : tabKey === 'banned' ? 'Banlananlar' : 'Kullanıcı Banla'}
                  </Text>
              </TouchableOpacity>
          ))}
      </View>

      <View style={{ flex: 1 }}>
          {activeTab === 'manual_ban' ? (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                  <ScrollView contentContainerStyle={adminPanelStyles.formContent}>
                      <Text style={adminPanelStyles.formTitle}>Manuel Kullanıcı Banlama</Text>
                      <Text style={adminPanelStyles.formDesc}>Kullanıcıyı ID veya Telefon numarası ile banlayıp silebilirsiniz.</Text>
                      
                      <View style={adminPanelStyles.inputGroup}>
                          <Text style={adminPanelStyles.label}>Kullanıcı ID:</Text>
                          <TextInput 
                            style={adminPanelStyles.input} 
                            placeholder="Örn: 15" 
                            placeholderTextColor={colors.textSecondary}
                            value={manualBanId} 
                            onChangeText={setManualBanId} 
                            keyboardType="numeric" 
                            selectionColor={colors.textPrimary}
                          />
                      </View>

                      <View style={adminPanelStyles.separator}><Text style={{color: colors.textSecondary}}>VEYA</Text></View>

                      <View style={adminPanelStyles.inputGroup}>
                          <Text style={adminPanelStyles.label}>Telefon Numarası:</Text>
                          <TextInput 
                            style={adminPanelStyles.input} 
                            placeholder="Örn: +905..." 
                            placeholderTextColor={colors.textSecondary}
                            value={manualBanPhone} 
                            onChangeText={setManualBanPhone} 
                            keyboardType="phone-pad" 
                            selectionColor={colors.textPrimary}
                          />
                      </View>

                      <ScaleButton style={[adminPanelStyles.btn, adminPanelStyles.btnBan, { marginTop: 30 }]} onPress={handleManualBan}>
                          {manualLoading ? <ActivityIndicator color="#fff" /> : <Text style={adminPanelStyles.btnText}>Kullanıcıyı Banla ve Sil</Text>}
                      </ScaleButton>
                  </ScrollView>
              </KeyboardAvoidingView>
          ) : (
              loading ? (
                  <ActivityIndicator size="large" color={colors.textPrimary} style={{marginTop: 50}} /> 
              ) : (
                  <FlatList
                    data={activeTab === 'reports' ? reports : bannedUsers}
                    keyExtractor={item => (activeTab === 'reports' ? `rep_${item.report_id}` : `ban_${item.id}`)}
                    renderItem={activeTab === 'reports' ? renderReportItem : renderBannedUserItem}
                    contentContainerStyle={adminPanelStyles.listContent}
                    ListEmptyComponent={
                        <Text style={adminPanelStyles.emptyText}>
                            {activeTab === 'reports' ? 'Bekleyen rapor yok.' : 'Banlanan kullanıcı yok.'}
                        </Text>
                    }
                  />
              )
          )}
      </View>

      {/* --- REPORT DETAIL MODAL --- */}
      <Modal visible={reportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setReportModalVisible(false)}>
        <View style={adminPanelStyles.modalOverlay}>
            <View style={adminPanelStyles.modalContainer}>
                <ScrollView contentContainerStyle={{flexGrow: 1}}>
                    {selectedReport && (
                        <>
                            <View style={adminPanelStyles.modalHeader}>
                                <Text style={adminPanelStyles.modalTitle}>Rapor Detayı</Text>
                                <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            {selectedReport.media_type === 'video' ? (
                                <Video source={{ uri: selectedReport.photo_url }} style={adminPanelStyles.evidenceVideo} useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping />
                            ) : (
                                <Image source={{ uri: selectedReport.photo_url }} style={adminPanelStyles.evidenceImage} resizeMode="contain" />
                            )}
                            <View style={adminPanelStyles.detailRow}><Text style={adminPanelStyles.label}>Sebep:</Text><Text style={adminPanelStyles.value}>{selectedReport.reason}</Text></View>
                            <View style={adminPanelStyles.detailRow}><Text style={adminPanelStyles.label}>Şüpheli:</Text><Text style={[adminPanelStyles.value, {color:'red'}]}>{selectedReport.uploader_username}</Text></View>
                            <View style={adminPanelStyles.actionButtons}>
                                <ScaleButton style={[adminPanelStyles.btn, adminPanelStyles.btnDismiss]} onPress={() => handleResolveReport('dismiss')}><Text style={adminPanelStyles.btnText}>Yoksay</Text></ScaleButton>
                                <ScaleButton style={[adminPanelStyles.btn, adminPanelStyles.btnDelete]} onPress={() => handleResolveReport('delete_content')}><Text style={adminPanelStyles.btnText}>İçeriği Sil</Text></ScaleButton>
                            </View>
                            <ScaleButton style={[adminPanelStyles.btn, adminPanelStyles.btnBan]} onPress={() => handleResolveReport('ban_user')}><Text style={adminPanelStyles.btnText}>KULLANICIYI BANLA VE SİL</Text></ScaleButton>
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* --- BANNED USER POPUP --- */}
      <Modal visible={banModalVisible} animationType="fade" transparent={true} onRequestClose={() => setBanModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setBanModalVisible(false)}>
            <View style={adminPanelStyles.modalOverlay}>
                <TouchableWithoutFeedback>
                    <View style={adminPanelStyles.modalContainer}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            {selectedBannedUser && (
                                <>
                                    <View style={adminPanelStyles.modalHeader}><Text style={adminPanelStyles.modalTitle}>Ban Detayı</Text><TouchableOpacity onPress={() => setBanModalVisible(false)}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity></View>
                                    <View style={adminPanelStyles.detailRow}><Text style={adminPanelStyles.label}>Kullanıcı Adı:</Text><Text style={adminPanelStyles.value}>{selectedBannedUser.username || "-"}</Text></View>
                                    <View style={adminPanelStyles.detailRow}><Text style={adminPanelStyles.label}>Telefon:</Text><Text style={adminPanelStyles.value}>{selectedBannedUser.phone_number}</Text></View>
                                    <View style={adminPanelStyles.detailRow}><Text style={adminPanelStyles.label}>Ban Sebebi:</Text><Text style={adminPanelStyles.value}>{selectedBannedUser.reason}</Text></View>
                                    <ScaleButton style={[adminPanelStyles.btn, adminPanelStyles.btnUnban]} onPress={handleUnbanUser}><Text style={adminPanelStyles.btnText}>Banı Kaldır</Text></ScaleButton>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
      </Modal>
    </LinearGradient>
  );
}