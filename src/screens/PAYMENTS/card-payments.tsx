import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

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
  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",

  danger: "#B42318",
};

/* =========================================================
   SCREEN
========================================================= */

export default function CardPaymentsScreen() {
  const navigation = useNavigation<any>();

  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);

  /* =======================================================
     CARD NUMBER FORMAT
  ======================================================= */

  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);

    const formatted = cleaned.replace(
      /(.{4})/g,
      "$1 "
    ).trim();

    setCardNumber(formatted);
  };

  /* =======================================================
     EXPIRY FORMAT
  ======================================================= */

  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);

    if (cleaned.length >= 3) {
      setExpiry(
        `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
      );
    } else {
      setExpiry(cleaned);
    }
  };

  /* =======================================================
     PAYMENT
  ======================================================= */

  const handlePayment = async () => {
    const cleanCardNumber = cardNumber.replace(/\s/g, "");

    if (!cardholderName.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter the cardholder name."
      );
      return;
    }

    if (cleanCardNumber.length !== 16) {
      Alert.alert(
        "Invalid card number",
        "Please enter a valid 16-digit card number."
      );
      return;
    }

    if (expiry.length !== 5) {
      Alert.alert(
        "Invalid expiry date",
        "Please enter the card expiry date in MM/YY format."
      );
      return;
    }

    if (cvv.length !== 3) {
      Alert.alert(
        "Invalid CVV",
        "Please enter your 3-digit CVV."
      );
      return;
    }

    try {
      setProcessing(true);

      /*
       * -----------------------------------------------------
       * CONNECT YOUR REAL PAYMENT PROVIDER HERE
       * -----------------------------------------------------
       *
       * Example:
       *
       * await createPayment({
       *   amount: 150,
       *   cardholderName,
       *   cardNumber: cleanCardNumber,
       *   expiry,
       *   cvv,
       * });
       *
       * IMPORTANT:
       * Do not send raw card details directly to Firestore.
       * Use your payment provider's secure checkout/tokenisation.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 1500)
      );

      Alert.alert(
        "Payment successful",
        "Your payment has been processed successfully.",
        [
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Payment failed",
        "We could not process your payment. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              Card Payment
            </Text>

            <Text style={styles.headerSubtitle}>
              Secure payment
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* =================================================
              PAYMENT SUMMARY
          ================================================= */}

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={26}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.summaryInformation}>
              <Text style={styles.summaryLabel}>
                Amount to pay
              </Text>

              <Text style={styles.amount}>
                R150.00
              </Text>

              <Text style={styles.summaryDescription}>
                Transport service payment
              </Text>
            </View>
          </View>

          {/* =================================================
              SECURITY
          ================================================= */}

          <View style={styles.securityBanner}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.success}
              />
            </View>

            <View style={styles.securityInformation}>
              <Text style={styles.securityTitle}>
                Secure payment
              </Text>

              <Text style={styles.securityText}>
                Your payment information is protected
                using secure payment processing.
              </Text>
            </View>
          </View>

          {/* =================================================
              PAYMENT FORM
          ================================================= */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Card details
            </Text>

            <Text style={styles.sectionDescription}>
              Enter the details shown on your card.
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* CARDHOLDER */}

            <InputField
              label="Cardholder name"
              placeholder="e.g. John Mokoena"
              value={cardholderName}
              onChangeText={setCardholderName}
              autoCapitalize="words"
              icon="person-outline"
            />

            {/* CARD NUMBER */}

            <InputField
              label="Card number"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              keyboardType="number-pad"
              maxLength={19}
              icon="card-outline"
            />

            {/* EXPIRY + CVV */}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <InputField
                  label="Expiry date"
                  placeholder="MM/YY"
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  keyboardType="number-pad"
                  maxLength={5}
                  icon="calendar-outline"
                />
              </View>

              <View style={styles.halfInput}>
                <InputField
                  label="CVV"
                  placeholder="123"
                  value={cvv}
                  onChangeText={(value) =>
                    setCvv(
                      value
                        .replace(/\D/g, "")
                        .slice(0, 3)
                    )
                  }
                  keyboardType="number-pad"
                  maxLength={3}
                  secureTextEntry
                  icon="lock-closed-outline"
                />
              </View>
            </View>
          </View>

          {/* =================================================
              PAYMENT METHODS
          ================================================= */}

          <View style={styles.acceptedCard}>
            <Text style={styles.acceptedTitle}>
              Accepted cards
            </Text>

            <View style={styles.cardBrands}>
              <View style={styles.brand}>
                <Text style={styles.brandText}>
                  VISA
                </Text>
              </View>

              <View style={styles.brand}>
                <Text style={styles.brandText}>
                  Mastercard
                </Text>
              </View>

              <View style={styles.brand}>
                <MaterialCommunityIcons
                  name="contactless-payment"
                  size={22}
                  color={COLORS.primary}
                />
              </View>
            </View>
          </View>

          {/* =================================================
              TERMS
          ================================================= */}

          <Text style={styles.terms}>
            By continuing, you authorise the payment
            provider to process this transaction securely.
          </Text>

          {/* =================================================
              PAY BUTTON
          ================================================= */}

          <TouchableOpacity
            style={[
              styles.payButton,
              processing && styles.payButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={processing}
            onPress={handlePayment}
          >
            {processing ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.payButtonText}>
                  Pay R150.00
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* =================================================
              CANCEL
          ================================================= */}

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            disabled={processing}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>
              Cancel payment
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   INPUT FIELD
========================================================= */

type InputFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: "default" | "number-pad";
  maxLength?: number;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType = "default",
  maxLength,
  secureTextEntry,
  autoCapitalize = "none",
}: InputFieldProps) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label}
      </Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.textLight}
          style={styles.inputIcon}
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9AA5AE"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 13,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textLight,
  },

  /* SUMMARY */

  summaryCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryInformation: {
    flex: 1,
    marginLeft: 15,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DCEBFA",
  },

  amount: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  summaryDescription: {
    marginTop: 2,
    fontSize: 12,
    color: "#DCEBFA",
  },

  /* SECURITY */

  securityBanner: {
    marginTop: 14,
    padding: 14,
    borderRadius: 15,
    backgroundColor: COLORS.softGreen,
    flexDirection: "row",
    alignItems: "center",
  },

  securityIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  securityInformation: {
    flex: 1,
    marginLeft: 11,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.success,
  },

  securityText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: "#3D6B56",
  },

  /* SECTION */

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionDescription: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textLight,
  },

  /* FORM */

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  inputContainer: {
    marginBottom: 16,
  },

  inputLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  inputWrapper: {
    minHeight: 52,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FAFBFC",
    flexDirection: "row",
    alignItems: "center",
  },

  inputIcon: {
    marginLeft: 14,
  },

  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 11,
    fontSize: 15,
    color: COLORS.text,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  halfInput: {
    flex: 1,
  },

  /* ACCEPTED CARDS */

  acceptedCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  acceptedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textLight,
  },

  cardBrands: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    gap: 8,
  },

  brand: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },

  brandText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  /* TERMS */

  terms: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    color: COLORS.textLight,
    paddingHorizontal: 10,
  },

  /* BUTTON */

  payButton: {
    height: 54,
    marginTop: 20,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  payButtonDisabled: {
    opacity: 0.65,
  },

  payButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  cancelButton: {
    height: 48,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textLight,
  },
});