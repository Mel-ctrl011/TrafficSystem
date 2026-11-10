
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#003366",
  background: "#F4F7FB",
  card: "#FFFFFF",
  border: "#E1E7EF",
  text: "#17202A",
  muted: "#6B7280",
  softBlue: "#EAF2F8",
  softGreen: "#EAF7EF",
  success: "#2E7D32",
};

const FAQS = [
  {
    question: "How do I view my traffic fines?",
    answer:
      "Open the Payments section from the main dashboard. Select Outstanding Penalties or Fines Overview to view the available fine information associated with your account.",
  },
  {
    question: "How can I pay my traffic fines?",
    answer:
      "Navigate to Payments, select the relevant fine and follow the available payment instructions. Always confirm the payment status before leaving the payment screen.",
  },
  {
    question: "How do I book an appointment?",
    answer:
      "Open the Appointments section, select Appointment Booking, choose an available service and follow the booking instructions.",
  },
  {
    question: "How do I renew my driver's licence?",
    answer:
      "Navigate to Licenses and select Renew Driver License. Follow the application instructions and provide the required supporting information.",
  },
  {
    question: "Can I change my registered phone number?",
    answer:
      "Yes. Open Profile, select Request edit and enter your updated contact details. Your request must be reviewed by an administrator before your official profile is changed.",
  },
  {
    question: "What should I do if I cannot access my account?",
    answer:
      "Check your internet connection and ensure that you are using the correct sign-in details. If the problem continues, contact TrafficConnect SA support.",
  },
  {
    question: "How can I check my payment history?",
    answer:
      "Open Payments and select Payment History to review the payment records available for your account.",
  },
];

type SupportCategoryProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

function SupportCategory({
  icon,
  title,
  description,
}: SupportCategoryProps) {
  return (
    <View style={styles.category}>
      <View style={styles.categoryIcon}>
        <Ionicons name={icon} size={21} color={COLORS.primary} />
      </View>

      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categoryDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function HelpScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const handleContactSupport = () => {
    Alert.alert(
      "Contact support",
      "Support contact details have not yet been configured. Please use the official TrafficConnect SA support channel."
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="headset-outline"
              size={32}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>
            How can we help?
          </Text>

          <Text style={styles.heroDescription}>
            Find answers and guidance for using TrafficConnect SA.
          </Text>
        </View>

        {/* Support categories */}
        <Text style={styles.sectionTitle}>
          Support topics
        </Text>

        <View style={styles.card}>
          <SupportCategory
            icon="card-outline"
            title="Fines and payments"
            description="Assistance with traffic fines, payments and receipts."
          />

          <View style={styles.divider} />

          <SupportCategory
            icon="calendar-outline"
            title="Appointments"
            description="Help with bookings, changes and appointment history."
          />

          <View style={styles.divider} />

          <SupportCategory
            icon="document-text-outline"
            title="Applications and licences"
            description="Guidance with licence renewals and vehicle applications."
          />

          <View style={styles.divider} />

          <SupportCategory
            icon="person-circle-outline"
            title="Account assistance"
            description="Help with account access and profile information."
          />
        </View>

        {/* FAQs */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            Frequently asked questions
          </Text>

          <Text style={styles.sectionSubtitle}>
            Select a question to view its answer.
          </Text>
        </View>

        {FAQS.map((faq, index) => {
          const expanded = expandedFAQ === index;

          return (
            <View key={index} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.faqQuestion}
                activeOpacity={0.75}
                onPress={() =>
                  setExpandedFAQ(expanded ? null : index)
                }
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <Text style={styles.faqQuestionText}>
                  {faq.question}
                </Text>

                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={19}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              {expanded && (
                <View style={styles.faqAnswerContainer}>
                  <View style={styles.divider} />

                  <Text style={styles.faqAnswer}>
                    {faq.answer}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Contact support */}
        <View style={styles.contactCard}>
          <View style={styles.contactIcon}>
            <Ionicons
              name="chatbubbles-outline"
              size={27}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.contactTitle}>
            Still need assistance?
          </Text>

          <Text style={styles.contactDescription}>
            If you cannot find the answer you need, contact
            the TrafficConnect SA support team.
          </Text>

          <TouchableOpacity
            style={styles.contactButton}
            activeOpacity={0.8}
            onPress={handleContactSupport}
          >
            <Ionicons
              name="headset-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.contactButtonText}>
              Contact support
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          TRAFFICCONNECT SA · HELP CENTRE
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 25,
  },
  heroIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  heroDescription: {
    color: "#DCE8F5",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 9,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHeading: {
    marginTop: 10,
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginTop: 11,
    marginBottom: 22,
  },
  category: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  categoryIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  categoryDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF1F5",
  },
  faqCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 9,
    paddingHorizontal: 15,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 12,
  },
  faqQuestionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 19,
  },
  faqAnswerContainer: {
    paddingBottom: 14,
  },
  faqAnswer: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    paddingTop: 11,
  },
  contactCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 20,
    alignItems: "center",
    marginTop: 18,
  },
  contactIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  contactTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  contactDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },
  contactButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 22,
    marginTop: 17,
    width: "100%",
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    textAlign: "center",
    color: "#9AA3AD",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 24,
  },
});
