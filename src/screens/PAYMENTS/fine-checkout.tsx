import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";

type PaymentMethod = "applePay" | "googlePay" | "card";

type FineData = {
  citizenId?: string;
  offence?: string;
  description?: string;
  outstandingAmount?: number;
  fineAmount?: number;
  amount?: number;
  paymentStatus?: string;
  status?: string;
  registrationNumber?: string;
};

type PaymentReceipt = {
  amount: number;
  fineReference: string;
  paymentReference: string;
  ticketId: string;
  paidAt: Date;
};

function passesLuhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let doubleDigit = false;

  for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
    let digit = Number(cardNumber[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return cardNumber.length >= 13 && cardNumber.length <= 19 && sum % 10 === 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function FineCheckoutScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { fineId, amount, ticketId, description } = route.params;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [step, setStep] = useState<"method" | "details">("method");
  const [fineReference, setFineReference] = useState(
    () => `FINE-${Crypto.randomUUID().toUpperCase()}`
  );
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [sharingReceipt, setSharingReceipt] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const formatCurrency = (value: number) =>
    `R ${value.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleContinue = () => {
    if (!selectedMethod) return;

    if (selectedMethod !== "card") {
      Alert.alert(
        "Payment method unavailable",
        "Apple Pay and Google Pay are coming soon. Please select card payment."
      );
      return;
    }

    setStep("details");
  };

  const normalizedCardNumber = cardNumber.replace(/\D/g, "");
  const isExpiryValid = useMemo(() => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    const [monthText, yearText] = expiry.split("/");
    const month = Number(monthText);
    const year = 2000 + Number(yearText);
    const now = new Date();
    return (
      month >= 1 &&
      month <= 12 &&
      (year > now.getFullYear() ||
        (year === now.getFullYear() && month >= now.getMonth() + 1))
    );
  }, [expiry]);

  const canSubmit = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneDigits = phone.replace(/\D/g, "");
    const cvvDigits = cvv.replace(/\D/g, "");

    return (
      customerName.trim().length > 1 &&
      emailValid &&
      phoneDigits.length >= 8 &&
      billingAddress.trim().length > 3 &&
      passesLuhnCheck(normalizedCardNumber) &&
      isExpiryValid &&
      (cvvDigits.length === 3 || cvvDigits.length === 4) &&
      billingZip.trim().length > 0 &&
      termsAccepted
    );
  }, [
    billingAddress,
    billingZip,
    customerName,
    cvv,
    email,
    isExpiryValid,
    normalizedCardNumber,
    phone,
    termsAccepted,
  ]);

  const validationErrors = useMemo(
    () => ({
      customerName:
        customerName.trim().length > 1 ? "" : "Enter the cardholder's name.",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? ""
        : "Enter a valid email address.",
      phone:
        phone.replace(/\D/g, "").length >= 8
          ? ""
          : "Enter a valid phone number.",
      billingAddress:
        billingAddress.trim().length > 3 ? "" : "Enter your billing address.",
      cardNumber: passesLuhnCheck(normalizedCardNumber)
        ? ""
        : "Check the card number and try again.",
      expiry: isExpiryValid ? "" : "Enter a valid, unexpired date (MM/YY).",
      cvv:
        cvv.replace(/\D/g, "").length >= 3
          ? ""
          : "Enter the 3- or 4-digit security code.",
      billingZip: billingZip.trim() ? "" : "Enter a ZIP or postal code.",
    }),
    [
      billingAddress,
      billingZip,
      customerName,
      cvv,
      email,
      isExpiryValid,
      normalizedCardNumber,
      phone,
    ]
  );

  const clearForm = () => {
    setCustomerName("");
    setEmail("");
    setPhone("");
    setBillingAddress("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setBillingZip("");
    setTermsAccepted(false);
  };

  const handleDemoSubmit = () => {
    setShowValidationErrors(true);
    if (!canSubmit || processing) return;
    void submitSimulatedPayment();
  };

  const submitSimulatedPayment = async () => {
    if (!user?.idNumber) {
      setPaymentError("Your session has expired. Sign in again to continue.");
      return;
    }

    if (!fineId) {
      setPaymentError(
        "We couldn't identify this fine. Return to outstanding penalties and try again."
      );
      return;
    }

    const attemptFineReference = `FINE-${Crypto.randomUUID().toUpperCase()}`;
    const paymentReference = `PAY-${Crypto.randomUUID().toUpperCase()}`;
    setFineReference(attemptFineReference);
    setPaymentError(null);
    setProcessing(true);

    try {
      const fineRef = doc(db, "fines", fineId);
      const historyRef = doc(collection(db, "paymentHistory"));

      const [paidAmount] = await Promise.all([
        runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(fineRef);
          if (!snapshot.exists()) {
            throw new Error("This fine no longer exists.");
          }

          const fine = snapshot.data() as FineData;
          if (fine.citizenId !== user.idNumber) {
            throw new Error("You are not authorised to pay this fine.");
          }

          const paymentStatus = String(fine.paymentStatus ?? "").toLowerCase();
          const status = String(fine.status ?? "").toLowerCase();
          if (
            paymentStatus === "paid" ||
            paymentStatus === "settled" ||
            status === "paid" ||
            status === "settled"
          ) {
            throw new Error("This fine has already been paid.");
          }

          const amountDue = Number(
            fine.outstandingAmount ?? fine.fineAmount ?? fine.amount ?? 0
          );
          if (!Number.isFinite(amountDue) || amountDue <= 0) {
            throw new Error("There is no outstanding balance on this fine.");
          }

          transaction.update(fineRef, {
            outstandingAmount: 0,
            status: "paid",
            paymentStatus: "paid",
            paymentReference,
            fineReference: attemptFineReference,
            paymentMethod: "card",
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.set(historyRef, {
            paymentId: historyRef.id,
            reference: paymentReference,
            fineReference: attemptFineReference,
            type: "traffic_fine",
            description: `Traffic fine payment: ${
              fine.offence ?? fine.description ?? description
            }`,
            citizenId: user.idNumber,
            userId: user.id ?? null,
            citizenName: user.fullName ?? "",
            fineId,
            ticketId,
            registrationNumber: fine.registrationNumber ?? null,
            amount: amountDue,
            currency: "ZAR",
            balanceBefore: amountDue,
            balanceAfter: 0,
            method: "card",
            methodLabel: "Card payment",
            status: "completed",
            simulated: true,
            createdAt: serverTimestamp(),
          });

          return amountDue;
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 700)),
      ]);

      setReceipt({
        amount: paidAmount,
        fineReference: attemptFineReference,
        paymentReference,
        ticketId,
        paidAt: new Date(),
      });
      setCustomerName("");
      setEmail("");
      setPhone("");
      setBillingAddress("");
      setBillingZip("");
      setTermsAccepted(false);
    } catch (error) {
      console.error("Fine checkout payment failed:", error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "We could not complete this payment. The fine remains outstanding."
      );
    } finally {
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setProcessing(false);
    }
  };

  const shareReceipt = async () => {
    if (!receipt || sharingReceipt) return;

    try {
      setSharingReceipt(true);
      const citizenName = escapeHtml(user?.fullName ?? "Citizen");
      const safeTicket = escapeHtml(receipt.ticketId);
      const safeFineReference = escapeHtml(receipt.fineReference);
      const safePaymentReference = escapeHtml(receipt.paymentReference);
      const amountText = escapeHtml(formatCurrency(receipt.amount));
      const paidAt = escapeHtml(receipt.paidAt.toLocaleString("en-ZA"));

      const file = await Print.printToFileAsync({
        html: `<!doctype html>
          <html><head><meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #17212B; padding: 32px; }
            h1 { color: #0B4F8A; }
            .notice { padding: 12px; background: #FEF3C7; color: #92400E; }
            table { width: 100%; margin-top: 24px; border-collapse: collapse; }
            td { padding: 12px 8px; border-bottom: 1px solid #D9E0E6; }
            td:first-child { color: #66737F; }
            td:last-child { text-align: right; font-weight: bold; }
            .total { margin-top: 24px; color: #0B4F8A; font-size: 22px; font-weight: bold; text-align: right; }
          </style></head><body>
          <h1>TrafficConnect SA</h1>
          <h2>Simulated payment receipt</h2>
          <p class="notice">Demo transaction only. No real card was charged. This receipt is not proof of bank settlement.</p>
          <table>
            <tr><td>Customer</td><td>${citizenName}</td></tr>
            <tr><td>Ticket number</td><td>${safeTicket}</td></tr>
            <tr><td>Fine reference</td><td>${safeFineReference}</td></tr>
            <tr><td>Payment reference</td><td>${safePaymentReference}</td></tr>
            <tr><td>Payment method</td><td>Card (simulated)</td></tr>
            <tr><td>Date</td><td>${paidAt}</td></tr>
          </table>
          <div class="total">Amount recorded: ${amountText}</div>
          </body></html>`,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: `Receipt ${receipt.paymentReference}`,
        });
      } else {
        Alert.alert(
          "Receipt created",
          `The PDF was created at:\n${file.uri}\n\nSharing is not available on this device.`
        );
      }
    } catch (error) {
      console.error("Fine receipt generation failed:", error);
      Alert.alert(
        "Receipt unavailable",
        "We couldn't create or share the receipt. Please try again."
      );
    } finally {
      setSharingReceipt(false);
    }
  };

  const renderAmountBreakdown = () => (
    <View style={styles.amountBreakdown}>
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>Fine amount</Text>
        <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
      </View>
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>Service fee</Text>
        <Text style={styles.breakdownValue}>{formatCurrency(0)}</Text>
      </View>
      <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
        <Text style={styles.breakdownTotalLabel}>Total due</Text>
        <Text style={styles.breakdownTotalValue}>{formatCurrency(amount)}</Text>
      </View>
    </View>
  );

  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    setCardNumber(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
  };

  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setExpiry(
      digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
    );
  };

  const renderPaymentMethod = (
    method: PaymentMethod,
    title: string,
    icon: React.ReactNode,
    unavailable = false
  ) => {
    const selected = selectedMethod === method;

    return (
      <TouchableOpacity
        key={method}
        style={[
          styles.methodOption,
          selected && styles.methodOptionSelected,
          unavailable && styles.methodOptionUnavailable,
        ]}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => setSelectedMethod(method)}
      >
        {icon}
        <Text
          style={[
            styles.methodOptionText,
            selected && styles.methodOptionTextSelected,
            unavailable && styles.methodOptionTextUnavailable,
          ]}
        >
          {title}
        </Text>
        {unavailable && <Text style={styles.comingSoon}>Coming soon</Text>}
        <View
          style={[
            styles.radio,
            selected && styles.radioSelected,
            unavailable && styles.radioUnavailable,
          ]}
        >
          {selected && <View style={styles.radioDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {processing ? (
          <View style={styles.processingScreen}>
            <View style={styles.processingIcon}>
              <ActivityIndicator size="large" color="#003366" />
            </View>
            <Text style={styles.processingTitle}>Recording demo payment</Text>
            <Text style={styles.subtitle}>
              Please wait while we update this simulated payment record.
            </Text>
            <Text style={styles.processingReference}>{fineReference}</Text>
          </View>
        ) : receipt ? (
          <View style={styles.receiptScreen}>
            <View style={styles.receiptSuccessIcon}>
              <Ionicons name="checkmark-circle" size={62} color="#2E7D32" />
            </View>
            <Text style={styles.receiptTitle}>Demo payment recorded</Text>
            <Text style={styles.subtitle}>
              The simulated payment is recorded and the fine is removed from
              the outstanding balance in this demo.
            </Text>

            <View style={styles.receiptCard}>
              <ReceiptRow
                label="Amount paid"
                value={formatCurrency(receipt.amount)}
                prominent
              />
              <ReceiptRow label="Ticket number" value={receipt.ticketId} />
              <ReceiptRow label="Payment method" value="Card payment" />
              <ReceiptRow
                label="Fine reference"
                value={receipt.fineReference}
              />
              <ReceiptRow
                label="Payment reference"
                value={receipt.paymentReference}
              />
              <ReceiptRow
                label="Date"
                value={receipt.paidAt.toLocaleString("en-ZA")}
              />
            </View>

            <View style={styles.demoReceiptNotice}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color="#8A5A00"
              />
              <Text style={styles.demoReceiptNoticeText}>
                Demo record only. No real card was charged. This is not proof
                of bank settlement.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.receiptShareButton,
                sharingReceipt && styles.buttonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={sharingReceipt}
              onPress={shareReceipt}
            >
              {sharingReceipt ? (
                <ActivityIndicator size="small" color="#003366" />
              ) : (
                <>
                  <Ionicons
                    name="share-outline"
                    size={19}
                    color="#003366"
                  />
                  <Text style={styles.receiptShareText}>
                    Share / save PDF receipt
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, styles.continueButtonActive]}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.continueButtonTextActive}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : step === "method" ? (
          <>
            <View style={styles.intro}>
              <View style={styles.secureIcon}>
                <Ionicons name="shield-checkmark" size={22} color="#003366" />
              </View>
              <Text style={styles.title}>Fine payment</Text>
              <Text style={styles.subtitle}>
                Review the amount and choose a payment method.
              </Text>
            </View>

            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>ONE-TIME PAYMENT</Text>
              <Text style={styles.amount}>{formatCurrency(amount)}</Text>
              <Text style={styles.fineDescription}>{description}</Text>
              {renderAmountBreakdown()}
              <View style={styles.referenceRow}>
                <Text style={styles.referenceLabel}>Ticket number</Text>
                <Text style={styles.referenceValue}>{ticketId}</Text>
              </View>
              <View style={styles.referenceRow}>
                <Text style={styles.referenceLabel}>Checkout reference</Text>
                <Text style={styles.referenceValue}>{fineReference}</Text>
              </View>
            </View>

            <View style={styles.oneTimeBadge}>
              <Ionicons name="calendar-outline" size={17} color="#003366" />
              <Text style={styles.oneTimeText}>One-time fine payment</Text>
            </View>

            <Text style={styles.sectionTitle}>Payment methods</Text>

            {renderPaymentMethod(
              "applePay",
              "Apple Pay",
              <MaterialCommunityIcons
                name="apple"
                size={24}
                color={selectedMethod === "applePay" ? "#003366" : "#7C8792"}
              />,
              true
            )}
            {renderPaymentMethod(
              "googlePay",
              "Google Pay",
              <MaterialCommunityIcons
                name="google"
                size={22}
                color={selectedMethod === "googlePay" ? "#003366" : "#7C8792"}
              />,
              true
            )}
            {renderPaymentMethod(
              "card",
              "Pay with card",
              <Ionicons
                name="card-outline"
                size={22}
                color={selectedMethod === "card" ? "#003366" : "#586570"}
              />
            )}

            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedMethod && styles.continueButtonActive,
              ]}
              activeOpacity={0.85}
              disabled={!selectedMethod}
              onPress={handleContinue}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  selectedMethod && styles.continueButtonTextActive,
                ]}
              >
                Continue
              </Text>
            </TouchableOpacity>

            <View style={styles.securityNote}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color="#003366"
              />
              <Text style={styles.securityText}>
                Payment processing is not configured in this demo.
              </Text>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.backToMethods}
              activeOpacity={0.8}
              onPress={() => {
                clearForm();
                setStep("method");
              }}
            >
              <Ionicons name="arrow-back" size={18} color="#003366" />
              <Text style={styles.backToMethodsText}>Payment methods</Text>
            </TouchableOpacity>

            <View style={styles.detailsHeader}>
              <Text style={styles.title}>Card details</Text>
              <Text style={styles.subtitle}>
                One-time payment of {formatCurrency(amount)}
              </Text>
            </View>

            <View style={styles.demoWarning}>
              <Ionicons name="warning-outline" size={20} color="#8A5A00" />
              <Text style={styles.demoWarningText}>
                Demo form only. Do not enter real card information. A
                PCI-compliant payment provider has not been connected.
              </Text>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewTopRow}>
                <Text style={styles.reviewTitle}>Payment summary</Text>
                <Text style={styles.reviewOneTime}>One-time</Text>
              </View>
              {renderAmountBreakdown()}
              <Text style={styles.reviewReference}>
                Fine reference: {fineReference}
              </Text>
            </View>

            {paymentError && (
              <View style={styles.paymentError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color="#B42318"
                />
                <View style={styles.paymentErrorContent}>
                  <Text style={styles.paymentErrorTitle}>
                    Payment not recorded
                  </Text>
                  <Text style={styles.paymentErrorText}>{paymentError}</Text>
                  <Text style={styles.paymentErrorHint}>
                    No card data was saved. Review the details below and retry.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>Customer details</Text>
              <InputField
                label="Full name"
                placeholder="Name on account"
                value={customerName}
                onChangeText={setCustomerName}
                autoCapitalize="words"
                errorMessage={
                  showValidationErrors ? validationErrors.customerName : ""
                }
              />
              <InputField
                label="Email address"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                errorMessage={showValidationErrors ? validationErrors.email : ""}
              />
              <InputField
                label="Phone number"
                placeholder="Phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                errorMessage={showValidationErrors ? validationErrors.phone : ""}
              />
              <InputField
                label="Billing address"
                placeholder="Street address"
                value={billingAddress}
                onChangeText={setBillingAddress}
                autoCapitalize="words"
                errorMessage={
                  showValidationErrors ? validationErrors.billingAddress : ""
                }
              />

              <Text
                style={[styles.formSectionTitle, styles.paymentDetailsTitle]}
              >
                Payment details
              </Text>
              <InputField
                label="Card number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                keyboardType="number-pad"
                maxLength={23}
                errorMessage={
                  showValidationErrors ? validationErrors.cardNumber : ""
                }
              />
              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <InputField
                    label="Expiry date"
                    placeholder="MM/YY"
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    keyboardType="number-pad"
                    maxLength={5}
                    errorMessage={
                      showValidationErrors ? validationErrors.expiry : ""
                    }
                  />
                </View>
                <View style={styles.formColumn}>
                  <InputField
                    label="CVV"
                    placeholder="123"
                    value={cvv}
                    onChangeText={(value) =>
                      setCvv(value.replace(/\D/g, "").slice(0, 4))
                    }
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    errorMessage={
                      showValidationErrors ? validationErrors.cvv : ""
                    }
                  />
                </View>
              </View>
              <InputField
                label="Billing ZIP / postal code"
                placeholder="ZIP or postal code"
                value={billingZip}
                onChangeText={setBillingZip}
                autoCapitalize="characters"
                errorMessage={
                  showValidationErrors ? validationErrors.billingZip : ""
                }
              />
            </View>

            <View style={styles.legalCard}>
              <Text style={styles.legalText}>
                This is a one-time payment for the fine shown above. A real
                payment may only be submitted after secure processing is
                provided by a PCI-compliant payment processor.
              </Text>
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: termsAccepted }}
                onPress={() => setTermsAccepted((accepted) => !accepted)}
              >
                <View
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                >
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I have read and accept the payment notice and terms.
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                termsAccepted && styles.continueButtonActive,
                (!termsAccepted || processing) && styles.buttonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!termsAccepted || processing}
              onPress={handleDemoSubmit}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  termsAccepted && styles.continueButtonTextActive,
                ]}
              >
                {paymentError ? "Retry demo approval" : "Continue to payment"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.simulationNote}>
              This demo records a simulated payment only. Card details stay
              in screen memory and are cleared after each attempt; they are
              never sent to a payment processor or stored.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InputField({
  label,
  errorMessage,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  errorMessage?: string;
}) {
  return (
    <View style={styles.inputField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.textInput}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        placeholderTextColor="#9AA5AE"
        autoCorrect={false}
      />
      {!!errorMessage && <Text style={styles.fieldError}>{errorMessage}</Text>}
    </View>
  );
}

function ReceiptRow({
  label,
  value,
  prominent = false,
}: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text
        style={[
          styles.receiptValue,
          prominent && styles.receiptAmount,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 36,
  },
  processingScreen: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  processingIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#EAF1F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  processingTitle: {
    color: "#003366",
    fontSize: 20,
    fontWeight: "800",
  },
  processingReference: {
    color: "#66737F",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 16,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3E8ED",
    padding: 15,
    marginBottom: 15,
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewTitle: {
    color: "#263746",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewOneTime: {
    color: "#003366",
    backgroundColor: "#EAF1F7",
    borderRadius: 14,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: "hidden",
  },
  reviewReference: {
    color: "#77838F",
    fontSize: 10,
    marginTop: 11,
  },
  paymentError: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F2C7C4",
    backgroundColor: "#FEF3F2",
    padding: 13,
    marginBottom: 15,
  },
  paymentErrorContent: {
    flex: 1,
    marginLeft: 9,
  },
  paymentErrorTitle: {
    color: "#9E2118",
    fontSize: 13,
    fontWeight: "800",
  },
  paymentErrorText: {
    color: "#7A271A",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  paymentErrorHint: {
    color: "#8C4A43",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
  },
  receiptScreen: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  receiptSuccessIcon: {
    alignItems: "center",
    marginBottom: 12,
  },
  receiptTitle: {
    color: "#003366",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3E8ED",
    paddingHorizontal: 15,
    paddingVertical: 4,
    marginTop: 22,
  },
  receiptRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
  },
  receiptLabel: {
    color: "#77838F",
    fontSize: 12,
  },
  receiptValue: {
    flex: 1,
    color: "#263746",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  receiptAmount: {
    color: "#003366",
    fontSize: 16,
    fontWeight: "800",
  },
  receiptShareButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#003366",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  receiptShareText: {
    color: "#003366",
    fontSize: 13,
    fontWeight: "800",
  },
  demoReceiptNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    marginTop: 15,
    backgroundColor: "#FFF4E5",
    borderRadius: 11,
  },
  demoReceiptNoticeText: {
    flex: 1,
    color: "#6E4A0B",
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 8,
  },
  intro: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 22,
  },
  secureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EAF1F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    color: "#003366",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#66737F",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  amountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "#E3E8ED",
  },
  oneTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EAF1F7",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 22,
  },
  oneTimeText: {
    color: "#003366",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },
  amountLabel: {
    color: "#77838F",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  amount: {
    color: "#003366",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  amountBreakdown: {
    width: "100%",
    marginTop: 17,
    borderTopWidth: 1,
    borderTopColor: "#E9EDF1",
    paddingTop: 9,
  },
  breakdownRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    color: "#66737F",
    fontSize: 12,
  },
  breakdownValue: {
    color: "#263746",
    fontSize: 12,
    fontWeight: "700",
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E9EDF1",
    marginTop: 5,
    paddingTop: 6,
  },
  breakdownTotalLabel: {
    color: "#263746",
    fontSize: 13,
    fontWeight: "800",
  },
  breakdownTotalValue: {
    color: "#003366",
    fontSize: 14,
    fontWeight: "800",
  },
  fineDescription: {
    color: "#4F5D69",
    fontSize: 14,
    textAlign: "center",
    marginTop: 3,
  },
  referenceRow: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#E9EDF1",
    marginTop: 18,
    paddingTop: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  referenceLabel: {
    color: "#77838F",
    fontSize: 12,
  },
  referenceValue: {
    flex: 1,
    color: "#263746",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  sectionTitle: {
    color: "#263746",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 11,
  },
  methodOption: {
    minHeight: 56,
    backgroundColor: "#FFFFFF",
    borderColor: "#E3E8ED",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  methodOptionSelected: {
    borderColor: "#003366",
    backgroundColor: "#EAF1F7",
  },
  methodOptionUnavailable: {
    opacity: 0.76,
  },
  methodOptionText: {
    flex: 1,
    color: "#263746",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 12,
  },
  methodOptionTextSelected: {
    color: "#003366",
  },
  methodOptionTextUnavailable: {
    color: "#586570",
  },
  comingSoon: {
    color: "#7A8792",
    fontSize: 11,
    fontWeight: "600",
    marginRight: 9,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#B8C2CB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#003366",
  },
  radioUnavailable: {
    opacity: 0.75,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#003366",
  },
  continueButton: {
    minHeight: 56,
    backgroundColor: "#D6DCE2",
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
  },
  continueButtonActive: {
    backgroundColor: "#003366",
  },
  continueButtonText: {
    color: "#87919A",
    fontSize: 15,
    fontWeight: "800",
  },
  continueButtonTextActive: {
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  securityNote: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  securityText: {
    color: "#66737F",
    fontSize: 11,
    marginLeft: 6,
  },
  backToMethods: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 12,
  },
  backToMethodsText: {
    color: "#003366",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },
  detailsHeader: {
    alignItems: "center",
    marginBottom: 18,
  },
  demoWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF4E5",
    borderColor: "#F2D5A7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },
  demoWarningText: {
    flex: 1,
    color: "#6E4A0B",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E3E8ED",
    padding: 16,
  },
  formSectionTitle: {
    color: "#263746",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  paymentDetailsTitle: {
    borderTopWidth: 1,
    borderTopColor: "#E9EDF1",
    paddingTop: 16,
    marginTop: 3,
  },
  inputField: {
    marginBottom: 13,
  },
  inputLabel: {
    color: "#4F5D69",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldError: {
    color: "#B42318",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
  },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#263746",
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formColumn: {
    flex: 1,
  },
  legalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3E8ED",
    padding: 15,
    marginTop: 15,
  },
  legalText: {
    color: "#66737F",
    fontSize: 12,
    lineHeight: 18,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#9AA5AE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#003366",
    borderColor: "#003366",
  },
  termsText: {
    flex: 1,
    color: "#263746",
    fontSize: 12,
    lineHeight: 17,
  },
  simulationNote: {
    color: "#7A8792",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 12,
  },
});
