
import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { getDeviceInfo } from "../utils/device";
import {
  verifyUser,
  activateUser,
} from "../services/authService";

import Toast from "../components/Toast";

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

type ToastType = "success" | "error" | "info";

const OTP_VALIDITY = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export default function VerifyAccountScreen({
  navigation,
}: any) {
  // =========================================================
  // STATE
  // =========================================================

  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");

  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);

  const [detailsVerified, setDetailsVerified] = useState(false);
  const [accountActivated, setAccountActivated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // =========================================================
  // TOAST
  // =========================================================

  const showToast = (
    message: string,
    type: ToastType = "info"
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // =========================================================
  // SHAKE ANIMATION
  // =========================================================

  const shake = () => {
    shakeAnim.setValue(0);

    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shakeStyle = {
    transform: [
      {
        translateX: shakeAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: [-8, 8],
        }),
      },
    ],
  };

  // =========================================================
  // OTP COUNTDOWN
  // =========================================================

  useEffect(() => {
    if (!generatedOtp || !otpExpiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((otpExpiresAt - Date.now()) / 1000)
      );

      setRemainingSeconds(remaining);
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [generatedOtp, otpExpiresAt]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  };

  // =========================================================
  // GENERATE IN-APP OTP
  // =========================================================

  const generateOtp = () => {
    // Demo implementation: six-digit activation code.
    const newOtp = String(
      Math.floor(100000 + Math.random() * 900000)
    );

    setGeneratedOtp(newOtp);
    setOtp("");
    setOtpAttempts(0);
    setOtpExpiresAt(Date.now() + OTP_VALIDITY);

    console.log("=================================");
    console.log("IN-APP ACTIVATION CODE GENERATED");
    console.log("OTP:", newOtp);
    console.log("Expires in: 5 minutes");
    console.log("=================================");

    showToast(
      "Your activation code has been generated.",
      "success"
    );
  };

  // =========================================================
  // VERIFY ID + REGISTERED PHONE
  // =========================================================

  const handleVerify = async () => {
    const cleanId = idNumber.trim();
    const cleanPhone = phone.trim();

    if (!cleanId || !cleanPhone) {
      showToast(
        "Please enter your ID number and registered phone number.",
        "error"
      );
      shake();
      return;
    }

    if (!/^\d{13}$/.test(cleanId)) {
      showToast(
        "Your South African ID number must contain exactly 13 digits.",
        "error"
      );
      shake();
      return;
    }

    if (cleanPhone.length < 9) {
      showToast(
        "Please enter a valid registered phone number.",
        "error"
      );
      shake();
      return;
    }

    setLoading(true);
    setLoadingMessage("Checking your citizen record...");

    try {
      console.log("=================================");
      console.log("STARTING CITIZEN VERIFICATION");
      console.log("=================================");

      const result = await verifyUser(
        cleanId,
        cleanPhone
      );

      console.log("VERIFY USER RESULT:", result);

      if (!result.success) {
        setDetailsVerified(false);

        showToast(
          result.message || "We could not verify your details.",
          "error"
        );

        return;
      }

      setDetailsVerified(true);

      // Only generate an OTP after citizen details match.
      generateOtp();

      console.log("CITIZEN DETAILS VERIFIED");
    } catch (error: any) {
      console.log("Citizen verification error:", error);

      showToast(
        error?.message || "Unable to verify your details. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // =========================================================
  // CONFIRM OTP + ACTIVATE ACCOUNT
  // =========================================================

  const handleConfirmOtp = async () => {
    if (!detailsVerified || !generatedOtp) {
      showToast(
        "Please verify your citizen details first.",
        "error"
      );
      return;
    }

    if (remainingSeconds <= 0 || Date.now() >= otpExpiresAt) {
      setGeneratedOtp("");
      setOtp("");
      showToast(
        "Your activation code has expired. Generate a new code.",
        "error"
      );
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      showToast(
        "Please enter the complete six-digit activation code.",
        "error"
      );
      shake();
      return;
    }

    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      setGeneratedOtp("");
      setOtp("");
      showToast(
        "Too many incorrect attempts. Generate a new activation code.",
        "error"
      );
      return;
    }

    if (otp.trim() !== generatedOtp) {
      const nextAttempts = otpAttempts + 1;
      setOtpAttempts(nextAttempts);
      setOtp("");

      shake();

      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        setGeneratedOtp("");
        setOtpExpiresAt(0);

        showToast(
          "Maximum attempts reached. Generate a new activation code.",
          "error"
        );
      } else {
        showToast(
          `Incorrect code. ${MAX_OTP_ATTEMPTS - nextAttempts} attempts remaining.`,
          "error"
        );
      }

      return;
    }

    setLoading(true);
    setLoadingMessage("Registering your device...");

    try {
      console.log("=================================");
      console.log("OTP CONFIRMED");
      console.log("STARTING DEVICE REGISTRATION");
      console.log("=================================");

      // Get the installation/device information only now.
      const device = await getDeviceInfo();

      console.log("DEVICE INFORMATION:", device);

      const result = await activateUser(
        idNumber.trim(),
        device
      );

      console.log("ACCOUNT ACTIVATION RESULT:", result);

      if (!result.success) {
        showToast(
          result.message || "Account activation failed.",
          "error"
        );
        return;
      }

      setAccountActivated(true);
      setGeneratedOtp("");
      setOtp("");
      setOtpExpiresAt(0);

      showToast(
        "Your account is now active. You can log in.",
        "success"
      );

      console.log("ACCOUNT ACTIVATED SUCCESSFULLY");
    } catch (error: any) {
      console.log("Activation error:", error);

      showToast(
        error?.message || "Unable to activate your account.",
        "error"
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // =========================================================
  // RESEND OTP
  // =========================================================

  const handleResendOtp = () => {
    if (!detailsVerified) {
      showToast(
        "Verify your citizen details first.",
        "error"
      );
      return;
    }

    if (accountActivated) return;

    generateOtp();
  };

  // =========================================================
  // CONTINUE TO LOGIN
  // =========================================================

  const handleContinue = () => {
    if (!accountActivated) {
      showToast(
        "Please complete account activation first.",
        "error"
      );
      return;
    }

    navigation.replace("Login");
  };

  // =========================================================
  // SUPPORT
  // =========================================================

  const handleSupport = async () => {
    const supportNumber = "27760000000";

    const supportMessage =
      "Hi, I need help with account verification.";

    const url =
      `https://wa.me/${supportNumber}` +
      `?text=${encodeURIComponent(supportMessage)}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast(
          "WhatsApp is not available on this device.",
          "error"
        );
      }
    } catch (error) {
      console.log("WhatsApp error:", error);

      showToast(
        "Unable to open WhatsApp.",
        "error"
      );
    }
  };

  // =========================================================
  // PROGRESS STEP
  // =========================================================

  const renderStep = (
    number: number,
    title: string,
    description: string,
    completed: boolean,
    disabled = false
  ) => (
    <View
      style={[
        styles.stepRow,
        disabled && styles.stepDisabled,
      ]}
    >
      <View
        style={[
          styles.stepCircle,
          completed && styles.stepCircleVerified,
        ]}
      >
        {completed ? (
          <Ionicons
            name="checkmark"
            size={17}
            color="#FFFFFF"
          />
        ) : (
          <Text style={styles.stepNumber}>
            {number}
          </Text>
        )}
      </View>

      <View style={styles.stepInformation}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>
            {title}
          </Text>

          {completed && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>
                COMPLETED
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.stepDescription}>
          {description}
        </Text>
      </View>
    </View>
  );

  // =========================================================
  // SCREEN
  // =========================================================

  return (
    <SafeAreaView style={styles.safe}>
      {/* REUSABLE TOAST */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3500}
        onHide={hideToast}
      />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              Activate Your Account
            </Text>

            <Text style={styles.subtitle}>
              Verify your citizen record, confirm your
              activation code and register your device
              to access TrafficConnect services.
            </Text>
          </View>

          {/* MAIN CARD */}

          <Animated.View
            style={[
              styles.verifyCard,
              shakeStyle,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.cardHeaderInformation}>
                <Text style={styles.cardTitle}>
                  Citizen Account Activation
                </Text>

                <Text style={styles.cardDescription}>
                  Complete the steps below to activate
                  your account.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* PROGRESS */}

            <Text style={styles.progressTitle}>
              Activation Progress
            </Text>

            <Text style={styles.progressSubtitle}>
              {accountActivated
                ? "Your account is ready."
                : "Complete all three steps to continue."}
            </Text>

            {renderStep(
              1,
              "Citizen Details",
              detailsVerified
                ? "Your ID and registered phone number match."
                : "Confirm your South African ID and registered phone.",
              detailsVerified
            )}

            <View style={styles.stepLine} />

            {renderStep(
              2,
              "In-App Activation Code",
              generatedOtp
                ? "Your six-digit activation code is ready."
                : accountActivated
                ? "Your activation code was confirmed."
                : "Confirm the code generated for this activation.",
              accountActivated
            )}

            <View style={styles.stepLine} />

            {renderStep(
              3,
              "Device Registration",
              accountActivated
                ? "This device is registered to your account."
                : "Your device will be linked after OTP confirmation.",
              accountActivated,
              !detailsVerified
            )}

            <View style={styles.sectionDivider} />

            {/* STEP 1: CITIZEN DETAILS */}

            {!detailsVerified && (
              <>
                <Text style={styles.sectionTitle}>
                  Your Citizen Details
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    SOUTH AFRICAN ID NUMBER
                  </Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={COLORS.textLight}
                    />

                    <TextInput
                      placeholder="Enter your 13-digit ID number"
                      placeholderTextColor="#8A949D"
                      value={idNumber}
                      onChangeText={(value) => {
                        setIdNumber(value.replace(/\D/g, ""));
                      }}
                      keyboardType="number-pad"
                      maxLength={13}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                  </View>

                  <Text style={styles.inputHint}>
                    Enter your 13-digit South African ID number.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    REGISTERED PHONE NUMBER
                  </Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color={COLORS.textLight}
                    />

                    <TextInput
                      placeholder="Enter your registered phone number"
                      placeholderTextColor="#8A949D"
                      value={phone}
                      onChangeText={(value) => {
                        setPhone(value.replace(/[^\d+]/g, ""));
                      }}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </View>

                  <Text style={styles.inputHint}>
                    Use the phone number linked to your citizen record.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={[
                    styles.primaryButton,
                    loading && styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />
                      <Text style={styles.primaryButtonText}>
                        {loadingMessage || "Please wait..."}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>
                        Verify Citizen Details
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* STEP 2: OTP */}

            {detailsVerified && !accountActivated && (
              <>
                <View style={styles.otpHeader}>
                  <View style={styles.otpIcon}>
                    <Ionicons
                      name="keypad-outline"
                      size={23}
                      color={COLORS.primary}
                    />
                  </View>

                  <Text style={styles.sectionTitle}>
                    Confirm Your Activation Code
                  </Text>
                </View>

                <Text style={styles.otpDescription}>
                  Your citizen details match our records.
                  Enter the six-digit code generated for this
                  activation attempt.
                </Text>

                {/* DEMO CODE DISPLAY */}

                <View style={styles.demoCodeCard}>
                  <Text style={styles.demoCodeLabel}>
                    YOUR IN-APP DEMO CODE
                  </Text>

                  <Text style={styles.demoCode}>
                    {generatedOtp}
                  </Text>

                  <Text style={styles.demoCodeHint}>
                    This code is displayed in-app for the
                    demonstration version.
                  </Text>
                </View>

                {/* COUNTDOWN */}

                <View style={styles.expiryRow}>
                  <Ionicons
                    name="time-outline"
                    size={17}
                    color={
                      remainingSeconds > 0
                        ? COLORS.primary
                        : COLORS.danger
                    }
                  />

                  <Text
                    style={[
                      styles.expiryText,
                      remainingSeconds <= 0 && {
                        color: COLORS.danger,
                      },
                    ]}
                  >
                    {remainingSeconds > 0
                      ? `Code expires in ${formatTime(remainingSeconds)}`
                      : "Activation code expired"}
                  </Text>
                </View>

                {/* OTP INPUT */}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    SIX-DIGIT ACTIVATION CODE
                  </Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={COLORS.textLight}
                    />

                    <TextInput
                      placeholder="Enter six-digit code"
                      placeholderTextColor="#8A949D"
                      value={otp}
                      onChangeText={(value) => {
                        setOtp(value.replace(/\D/g, "").slice(0, 6));
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.input}
                    />
                  </View>

                  <Text style={styles.inputHint}>
                    {MAX_OTP_ATTEMPTS - otpAttempts} attempts remaining.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleConfirmOtp}
                  disabled={loading || remainingSeconds <= 0}
                  activeOpacity={0.8}
                  style={[
                    styles.primaryButton,
                    (loading || remainingSeconds <= 0) &&
                      styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />
                      <Text style={styles.primaryButtonText}>
                        {loadingMessage || "Please wait..."}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>
                        Confirm Code & Activate
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={loading}
                  style={styles.resendButton}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={17}
                    color={COLORS.primary}
                  />

                  <Text style={styles.resendText}>
                    Generate a New Code
                  </Text>
                </TouchableOpacity>

                <Text style={styles.attemptNotice}>
                  A new code resets the attempt counter.
                  The code is valid for five minutes.
                </Text>
              </>
            )}

            {/* STEP 3: ACTIVATION SUCCESS */}

            {accountActivated && (
              <>
                <View style={styles.successCard}>
                  <View style={styles.successIcon}>
                    <Ionicons
                      name="checkmark"
                      size={30}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.successTitle}>
                    Account Successfully Activated
                  </Text>

                  <Text style={styles.successDescription}>
                    Your citizen details have been verified,
                    your activation code was confirmed and
                    this device has been registered.
                  </Text>

                  <View style={styles.registeredDevice}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={19}
                      color={COLORS.success}
                    />

                    <Text style={styles.registeredDeviceText}>
                      This device is now linked to your account.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleContinue}
                  activeOpacity={0.8}
                  style={styles.continueButton}
                >
                  <Text style={styles.primaryButtonText}>
                    Continue to Login
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* SECURITY NOTICE */}

          <View style={styles.securityNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={COLORS.primary}
            />

            <Text style={styles.securityText}>
              Your device is linked to your citizen account.
              Login attempts from unregistered devices will
              be rejected.
            </Text>
          </View>

          {/* SUPPORT */}

          <TouchableOpacity
            onPress={handleSupport}
            activeOpacity={0.7}
            style={styles.supportButton}
          >
            <View style={styles.supportIcon}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.supportInformation}>
              <Text style={styles.supportTitle}>
                Need Help?
              </Text>

              <Text style={styles.supportDescription}>
                Contact support for assistance with account activation.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

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

// =============================================================
// STYLES
// =============================================================

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
    paddingTop: 30,
    paddingBottom: 35,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
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
    textAlign: "center",
  },

  subtitle: {
    marginTop: 6,
    maxWidth: 335,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  verifyCard: {
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

  progressTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  progressSubtitle: {
    marginTop: 3,
    marginBottom: 14,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },

  stepDisabled: {
    opacity: 0.55,
  },

  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  stepCircleVerified: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },

  stepNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textLight,
  },

  stepInformation: {
    flex: 1,
    marginLeft: 10,
  },

  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  stepTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  stepDescription: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
  },

  stepLine: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.border,
    marginLeft: 15,
    marginVertical: 4,
  },

  verifiedBadge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: COLORS.softGreen,
  },

  verifiedBadgeText: {
    fontSize: 6.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: COLORS.success,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 13,
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
    lineHeight: 13,
    color: COLORS.textLight,
  },

  primaryButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    marginTop: 3,
    paddingHorizontal: 12,
  },

  primaryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    marginRight: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  otpIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  otpDescription: {
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.textLight,
    marginBottom: 13,
  },

  demoCodeCard: {
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 12,
  },

  demoCodeLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
  },

  demoCode: {
    marginTop: 7,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 7,
    color: COLORS.primaryDark,
  },

  demoCodeHint: {
    marginTop: 6,
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: "center",
  },

  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  expiryText: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },

  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },

  resendText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  attemptNotice: {
    textAlign: "center",
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },

  successCard: {
    alignItems: "center",
    backgroundColor: COLORS.softGreen,
    borderWidth: 1,
    borderColor: "#B7E3CA",
    borderRadius: 10,
    padding: 16,
    marginTop: 15,
  },

  successIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  successTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.success,
    textAlign: "center",
  },

  successDescription: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.text,
  },

  registeredDevice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    marginTop: 13,
  },

  registeredDeviceText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.success,
  },

  continueButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    borderRadius: 9,
    marginTop: 12,
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

  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
  },

  supportIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  supportInformation: {
    flex: 1,
    marginLeft: 9,
    marginRight: 7,
  },

  supportTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  supportDescription: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 13,
    color: COLORS.textLight,
  },

  footer: {
    marginTop: 24,
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
