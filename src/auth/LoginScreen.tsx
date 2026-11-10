
import React, { useEffect, useState } from "react";

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  verifyLogin,
  findRegisteredDevice,
} from "../services/authService";

import { getDeviceInfo } from "../utils/device";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   COLOURS
========================================================= */

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",
  background: "#F3F5F7",
  card: "#FFFFFF",
  text: "#17212B",
  textLight: "#66737F",
  border: "#D9E0E6",
  success: "#18794E",
  danger: "#B42318",
  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",
  softRed: "#FEF3F2",
};

/* =========================================================
   TYPES
========================================================= */

interface RegisteredDevice {
  deviceId?: string;
  model?: string;
  os?: string;
  osVersion?: string;
}

/* =========================================================
   MASK DEVICE ID
========================================================= */

const maskDeviceId = (deviceId?: string) => {
  if (!deviceId) return "Unavailable";

  if (deviceId.length <= 8) {
    return `${deviceId.slice(0, 2)}••••`;
  }

  return `${deviceId.slice(0, 4)}••••••••${deviceId.slice(-4)}`;
};

/* =========================================================
   SCREEN
========================================================= */

export default function LoginScreen({ navigation }: any) {
  // AuthContext is now responsible for login state.
  const { reloadUser } = useAuth();

  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [registeredDevice, setRegisteredDevice] =
    useState<RegisteredDevice | null>(null);

  const [checkingDevice, setCheckingDevice] =
    useState(true);

  const [deviceError, setDeviceError] = useState(false);

  /* =======================================================
     FETCH REGISTERED DEVICE FROM FIREBASE
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadRegisteredDevice = async () => {
      try {
        setCheckingDevice(true);
        setDeviceError(false);

        const device = await getDeviceInfo();

        const result = await findRegisteredDevice(device);

        if (!mounted) return;

        if (
          result.success &&
          result.found &&
          result.device
        ) {
          setRegisteredDevice(result.device);
        } else {
          setRegisteredDevice(null);
        }
      } catch (error) {
        console.log(
          "Registered device lookup error:",
          error
        );

        if (mounted) {
          setDeviceError(true);
          setRegisteredDevice(null);
        }
      } finally {
        if (mounted) {
          setCheckingDevice(false);
        }
      }
    };

    loadRegisteredDevice();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async () => {
    const cleanIdNumber = idNumber.trim();

    if (!/^\d{13}$/.test(cleanIdNumber)) {
      setMessage(
        "Please enter a valid 13-digit South African ID number."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 1. Get current device information.
      const device = await getDeviceInfo();

      // 2. Verify citizen account and registered device.
      const result = await verifyLogin(
        cleanIdNumber,
        device
      );

      if (!result.success) {
        setMessage(
          result.message ||
            "Unable to sign in. Please check your details and registered device."
        );
        return;
      }

      // 3. Save citizen ID.
      await AsyncStorage.setItem(
        "userId",
        cleanIdNumber
      );

      // 4. Load citizen profile from Firestore.
      const profileLoaded = await reloadUser();

      // 5. Only continue when profile and device are verified.
      if (!profileLoaded) {
        setMessage(
          "Your details were verified, but we couldn't load your citizen profile. Please check your connection and try again."
        );

        return;
      }

      // AuthContext updates isLoggedIn automatically.
      // RootNavigator will open MainNavigator.

    } catch (error: any) {
      console.log("Login error:", error);

      setMessage(
        "Unable to connect. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={31}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.eyebrow}>
              TRAFFICCONNECT SA
            </Text>

            <Text style={styles.title}>
              Welcome Back
            </Text>

            <Text style={styles.subtitle}>
              Access your traffic department services,
              licences, vehicles and payments securely.
            </Text>
          </View>

          {/* REGISTERED DEVICE CARD */}

          <View style={styles.registeredDeviceCard}>
            <View style={styles.deviceCardHeader}>
              <View style={styles.deviceCardIcon}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={23}
                  color={COLORS.success}
                />
              </View>

              <View style={styles.deviceCardHeading}>
                <Text style={styles.deviceCardTitle}>
                  Registered Device
                </Text>

                <Text style={styles.deviceCardSubtitle}>
                  Your account's linked device
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />

                <Text style={styles.statusText}>
                  {checkingDevice
                    ? "Checking"
                    : registeredDevice
                    ? "Linked"
                    : "Unavailable"}
                </Text>
              </View>
            </View>

            <View style={styles.deviceDivider} />

            {checkingDevice ? (
              <View style={styles.deviceLoading}>
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />

                <Text style={styles.deviceLoadingText}>
                  Verifying registered device...
                </Text>
              </View>
            ) : registeredDevice ? (
              <>
                <Text style={styles.deviceLabel}>
                  REGISTERED DEVICE ID
                </Text>

                <View style={styles.deviceIdContainer}>
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color={COLORS.primary}
                  />

                  <Text
                    style={styles.deviceIdText}
                    selectable={false}
                  >
                    {maskDeviceId(
                      registeredDevice.deviceId
                    )}
                  </Text>

                  <Ionicons
                    name="eye-off-outline"
                    size={17}
                    color={COLORS.textLight}
                  />
                </View>

                <View style={styles.deviceDetails}>
                  <View style={styles.deviceDetailItem}>
                    <Ionicons
                      name="hardware-chip-outline"
                      size={16}
                      color={COLORS.textLight}
                    />

                    <Text style={styles.deviceDetailText}>
                      {registeredDevice.model ||
                        "Device model unavailable"}
                    </Text>
                  </View>

                  <View style={styles.deviceDetailItem}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={16}
                      color={COLORS.textLight}
                    />

                    <Text style={styles.deviceDetailText}>
                      {[
                        registeredDevice.os,
                        registeredDevice.osVersion,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                        "Operating system unavailable"}
                    </Text>
                  </View>
                </View>

                <View style={styles.linkedMessage}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={COLORS.success}
                  />

                  <Text style={styles.linkedMessageText}>
                    This device is linked to a registered
                    citizen account.
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.deviceUnavailable}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={COLORS.danger}
                />

                <Text style={styles.deviceUnavailableText}>
                  {deviceError
                    ? "Unable to retrieve device information. Check your connection."
                    : "No registered device information was found."}
                </Text>
              </View>
            )}
          </View>

          {/* LOGIN CARD */}

          <View style={styles.loginCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons
                  name="person-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.cardHeaderInformation}>
                <Text style={styles.cardTitle}>
                  Citizen Login
                </Text>

                <Text style={styles.cardDescription}>
                  Enter your South African ID number
                  to continue.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ID NUMBER */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                ID NUMBER
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={COLORS.textLight}
                />

                <TextInput
                  placeholder="South African ID Number"
                  placeholderTextColor="#8A949D"
                  value={idNumber}
                  onChangeText={(value) => {
                    setIdNumber(
                      value.replace(/\D/g, "").slice(0, 13)
                    );

                    if (message) {
                      setMessage("");
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={13}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  editable={!loading}
                />
              </View>

              <Text style={styles.inputHint}>
                Enter your 13-digit South African ID number.
              </Text>
            </View>

            {/* ERROR MESSAGE */}

            {message !== "" && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={COLORS.danger}
                />

                <Text style={styles.errorText}>
                  {message}
                </Text>
              </View>
            )}

            {/* LOGIN BUTTON */}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text style={styles.loginButtonText}>
                    Verifying device...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>
                    Login
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* SECURITY NOTICE */}

          <View style={styles.securityNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={COLORS.primary}
            />

            <Text style={styles.securityText}>
              Security verification is performed against
              your registered device. Access from an
              unregistered device is restricted.
            </Text>
          </View>

          {/* FOOTER */}

          <Text style={styles.footer}>
            TrafficConnect SA
          </Text>

          <Text style={styles.footerSubtext}>
            Secure Citizen Services
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboard: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 35,
    paddingBottom: 55,
  },

  header: {
    alignItems: "center",
    marginBottom: 22,
  },

  logoContainer: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
  },

  title: {
    marginTop: 3,
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 6,
    maxWidth: 330,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  registeredDeviceCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: "#B8DEC9",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
  },

  deviceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  deviceCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },

  deviceCardHeading: {
    flex: 1,
    marginLeft: 10,
  },

  deviceCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  deviceCardSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textLight,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softGreen,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.success,
  },

  deviceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  deviceLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.textLight,
    marginBottom: 7,
  },

  deviceIdContainer: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 8,
    paddingHorizontal: 11,
  },

  deviceIdText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
  },

  deviceDetails: {
    marginTop: 12,
    gap: 9,
  },

  deviceDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  deviceDetailText: {
    marginLeft: 8,
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textLight,
  },

  linkedMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softGreen,
    borderRadius: 7,
    padding: 9,
    marginTop: 13,
  },

  linkedMessageText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
    color: COLORS.success,
  },

  deviceLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },

  deviceLoadingText: {
    marginLeft: 9,
    fontSize: 11,
    color: COLORS.textLight,
  },

  deviceUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softRed,
    borderRadius: 8,
    padding: 11,
  },

  deviceUnavailableText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.danger,
  },

  loginCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  cardHeaderInformation: {
    flex: 1,
    marginLeft: 10,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  cardDescription: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  inputGroup: {
    marginBottom: 15,
  },

  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: COLORS.textLight,
    marginBottom: 6,
  },

  inputContainer: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
  },

  input: {
    flex: 1,
    marginLeft: 9,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 0,
  },

  inputHint: {
    marginTop: 5,
    fontSize: 9,
    color: COLORS.textLight,
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softRed,
    borderWidth: 1,
    borderColor: "#F3C7C3",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.danger,
  },

  loginButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    marginBottom: 2,
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginRight: 8,
  },

  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 9,
    padding: 11,
    marginTop: 18,
  },

  securityText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 9,
    lineHeight: 15,
    color: COLORS.text,
  },

  footer: {
    marginTop: 23,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },

  footerSubtext: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 9,
    color: COLORS.textLight,
  },
});
