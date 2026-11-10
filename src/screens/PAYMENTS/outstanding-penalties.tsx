import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useFocusEffect } from "@react-navigation/native";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

/* =========================================================
   TYPES
========================================================= */

type FineStatus = "Outstanding" | "Overdue" | "Paid" | "Disputed";

type FirestoreFine = {
  fineId?: string;

  citizenId?: string;
  citizenName?: string;

  ticketId?: string;
  reference?: string;

  type?: string;
  category?: string;

  offence?: string;
  description?: string;

  vehicleId?: string;
  registrationNumber?: string;

  recordedSpeed?: number;
  speed?: number;
  speedLimit?: number;

  location?: string;
  cameraLocation?: string;

  date?: string;
  offenceDate?: string;
  issuedAt?: string;
  dueDate?: string;

  amount?: number;
  fineAmount?: number;
  outstandingAmount?: number;

  currency?: string;

  status?: string;
  paymentStatus?: string;

  paymentReference?: string;
  paidAt?: any;

  issuingAuthority?: string;

  isTestData?: boolean;

  createdAt?: any;
  updatedAt?: any;

  [key: string]: any;
};

type DisplayFine = FirestoreFine & {
  id: string;
  displayStatus: FineStatus;
};

/* =========================================================
   SCREEN
========================================================= */

export default function OutstandingPenaltiesScreen({ navigation }: any) {
  const { user } = useAuth();

  const [fines, setFines] = useState<DisplayFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =======================================================
     STATUS NORMALIZATION
  ======================================================= */

  const getDisplayStatus = useCallback((fine: FirestoreFine): FineStatus => {
    const paymentStatus = String(fine.paymentStatus ?? "").toLowerCase();
    const status = String(fine.status ?? "").toLowerCase();

    // PAID
    if (
      paymentStatus === "paid" ||
      paymentStatus === "settled" ||
      status === "paid" ||
      status === "settled"
    ) {
      return "Paid";
    }

    // DISPUTED
    if (
      paymentStatus === "disputed" ||
      paymentStatus.includes("dispute") ||
      status === "disputed" ||
      status.includes("dispute") ||
      status.includes("review")
    ) {
      return "Disputed";
    }

    // OVERDUE: due date passed and not paid
    if (fine.dueDate) {
      const dueDate = new Date(fine.dueDate);
      const now = new Date();

      if (
        !Number.isNaN(dueDate.getTime()) &&
        dueDate.getTime() < now.getTime()
      ) {
        return "Overdue";
      }
    }

    return "Outstanding";
  }, []);

  /* =======================================================
     AMOUNT / CURRENCY / DATE HELPERS
  ======================================================= */

  const getAmount = useCallback((fine: FirestoreFine): number => {
    const amount = Number(
      fine.outstandingAmount ?? fine.fineAmount ?? fine.amount ?? 0
    );

    return Number.isFinite(amount) ? amount : 0;
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `R ${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const formatDate = useCallback((date?: string | any) => {
    if (!date) {
      return "Date unavailable";
    }

    try {
      let parsedDate: Date;

      if (typeof date === "object" && typeof date.toDate === "function") {
        parsedDate = date.toDate();
      } else {
        parsedDate = new Date(date);
      }

      if (Number.isNaN(parsedDate.getTime())) {
        return String(date);
      }

      return parsedDate.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(date);
    }
  }, []);

  const getReference = (fine: FirestoreFine) => {
    return fine.ticketId ?? fine.reference ?? fine.fineId ?? "Not Available";
  };

  /* =======================================================
     LOAD FINES

     Reads fines where citizenId == user.idNumber
  ======================================================= */

  const loadFines = useCallback(
    async (showLoader = true) => {
      if (!user?.idNumber) {
        setFines([]);

        if (showLoader) {
          setLoading(false);
        }

        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        const finesQuery = query(
          collection(db, "fines"),
          where("citizenId", "==", user.idNumber)
        );

        const snapshot = await getDocs(finesQuery);

        const loadedFines: DisplayFine[] = snapshot.docs.map((fineDoc) => {
          const data = fineDoc.data() as FirestoreFine;

          return {
            ...data,
            id: fineDoc.id,
            displayStatus: getDisplayStatus(data),
          };
        });

        // Newest first
        loadedFines.sort((a, b) => {
          const dateA = new Date(
            a.offenceDate ?? a.date ?? a.issuedAt ?? 0
          ).getTime();

          const dateB = new Date(
            b.offenceDate ?? b.date ?? b.issuedAt ?? 0
          ).getTime();

          return dateB - dateA;
        });

        setFines(loadedFines);
      } catch (error) {
        console.error("❌ LOAD FINES ERROR:", error);

        Alert.alert(
          "Unable to Load Penalties",
          "We couldn't retrieve your traffic penalties. Please try again."
        );

        setFines([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.idNumber, getDisplayStatus]
  );

  useFocusEffect(
    useCallback(() => {
      loadFines(true);
    }, [loadFines])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFines(false);
  };

  /* =======================================================
     FILTERS AND TOTALS
  ======================================================= */

  const outstandingFines = useMemo(
    () => fines.filter((fine) => fine.displayStatus === "Outstanding"),
    [fines]
  );

  const overdueFines = useMemo(
    () => fines.filter((fine) => fine.displayStatus === "Overdue"),
    [fines]
  );

  const paidFines = useMemo(
    () => fines.filter((fine) => fine.displayStatus === "Paid"),
    [fines]
  );

  const totalOutstanding = useMemo(() => {
    return fines
      .filter(
        (fine) =>
          fine.displayStatus === "Outstanding" ||
          fine.displayStatus === "Overdue"
      )
      .reduce((total, fine) => total + getAmount(fine), 0);
  }, [fines, getAmount]);

  const handlePay = (fine: DisplayFine) => {
    navigation.navigate("FineCheckout", {
      fineId: fine.id,
      amount: getAmount(fine),
      ticketId: getReference(fine),
      description: fine.offence ?? fine.description ?? "Traffic violation",
    });
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <MaterialIcons name="receipt-long" size={30} color="#003366" />
        </View>

        <ActivityIndicator
          size="small"
          color="#003366"
          style={styles.loader}
        />

        <Text style={styles.loadingTitle}>Loading penalties</Text>

        <Text style={styles.loadingText}>
          Retrieving your traffic records...
        </Text>
      </View>
    );
  }

  const unpaidCount = outstandingFines.length + overdueFines.length;

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#003366"
          />
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerAccent} />

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>TRAFFIC SERVICES</Text>

              <Text style={styles.title}>Outstanding Penalties</Text>

              <Text style={styles.subtitle}>
                View unpaid traffic penalties and settle your outstanding
                balance securely.
              </Text>
            </View>
          </View>
        </View>

        {/* ACCOUNT */}

        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <MaterialIcons name="person" size={21} color="#003366" />
          </View>

          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>CITIZEN ACCOUNT</Text>

            <Text style={styles.accountName} numberOfLines={1}>
              {user?.fullName ?? "Citizen"}
            </Text>

            <Text style={styles.accountId}>
              ID: {user?.idNumber ?? "Unavailable"}
            </Text>
          </View>

          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={15} color="#2E7D32" />

            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <MaterialIcons name="receipt-long" size={25} color="#003366" />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>

            <Text style={styles.summaryAmount}>
              {formatCurrency(totalOutstanding)}
            </Text>

            <Text style={styles.summaryDescription}>
              Amount currently requiring payment
            </Text>
          </View>
        </View>

        {/* QUICK STATS */}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialIcons name="pending-actions" size={21} color="#003366" />
            </View>

            <Text style={styles.statNumber}>{outstandingFines.length}</Text>

            <Text style={styles.statLabel}>Outstanding</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWarning}>
              <MaterialIcons name="warning" size={21} color="#C62828" />
            </View>

            <Text style={[styles.statNumber, styles.warningText]}>
              {overdueFines.length}
            </Text>

            <Text style={styles.statLabel}>Overdue</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconPaid}>
              <MaterialIcons name="check-circle" size={21} color="#2E7D32" />
            </View>

            <Text style={[styles.statNumber, styles.paidNumber]}>
              {paidFines.length}
            </Text>

            <Text style={styles.statLabel}>Paid</Text>
          </View>
        </View>

        {/* INFORMATION */}

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#003366"
          />

          <Text style={styles.infoText}>
            Traffic penalties shown here are associated with your verified
            citizen account.
          </Text>
        </View>

        {/* RECORD HEADER */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>RECORDS</Text>

            <Text style={styles.sectionTitle}>Unpaid Penalties</Text>
          </View>

          <Text style={styles.sectionCount}>
            {unpaidCount} {unpaidCount === 1 ? "penalty" : "penalties"}
          </Text>
        </View>

        {/* PENALTIES */}

        {unpaidCount === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="check-circle" size={42} color="#2E7D32" />
            </View>

            <Text style={styles.emptyTitle}>No Outstanding Penalties</Text>

            <Text style={styles.emptyText}>
              You currently have no unpaid traffic penalties on your account.
            </Text>

            {fines.length > 0 && (
              <Text style={styles.emptySubtext}>
                {fines.length} total traffic{" "}
                {fines.length === 1 ? "record" : "records"} found, all
                currently settled.
              </Text>
            )}
          </View>
        ) : (
          <>
            {outstandingFines.map((fine) =>
              renderFineCard({
                fine,
                formatCurrency,
                formatDate,
                getReference,
                getAmount,
                handlePay,
              })
            )}

            {overdueFines.map((fine) =>
              renderFineCard({
                fine,
                formatCurrency,
                formatDate,
                getReference,
                getAmount,
                handlePay,
              })
            )}
          </>
        )}

        {/* DATA FOOTER */}

        <View style={styles.dataFooter}>
          <MaterialIcons name="storage" size={16} color="#888" />

          <Text style={styles.dataFooterText}>
            {fines.length} traffic {fines.length === 1 ? "record" : "records"}{" "}
            found for this citizen account
          </Text>
        </View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <MaterialIcons name="lock-outline" size={18} color="#777" />

          <Text style={styles.footerText}>
            Payment information is handled securely.
          </Text>
        </View>
      </ScrollView>

    </View>
  );
}

/* =========================================================
   FINE CARD
========================================================= */

function renderFineCard({
  fine,
  formatCurrency,
  formatDate,
  getReference,
  getAmount,
  handlePay,
}: {
  fine: DisplayFine;
  formatCurrency: (amount: number) => string;
  formatDate: (date?: string | any) => string;
  getReference: (fine: FirestoreFine) => string;
  getAmount: (fine: FirestoreFine) => number;
  handlePay: (fine: DisplayFine) => void;
}) {
  const isOverdue = fine.displayStatus === "Overdue";

  const offence = fine.offence ?? fine.description ?? "Traffic violation";

  const reference = getReference(fine);

  const amount = getAmount(fine);

  const date = fine.offenceDate ?? fine.date ?? fine.issuedAt;

  return (
    <View key={fine.id} style={styles.fineCard}>
      {/* HEADER */}

      <View style={styles.fineHeader}>
        <View style={styles.fineTitleRow}>
          <View style={styles.fineIcon}>
            <MaterialIcons
              name={fine.type === "speed_camera" ? "speed" : "gavel"}
              size={21}
              color="#003366"
            />
          </View>

          <View style={styles.fineTitleContainer}>
            <Text style={styles.fineTitle} numberOfLines={2}>
              {offence}
            </Text>

            <Text style={styles.reference}>{reference}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            isOverdue ? styles.overdueBadge : styles.outstandingBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isOverdue ? styles.overdueText : styles.outstandingText,
            ]}
          >
            {fine.displayStatus}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* DETAILS */}

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>DATE</Text>

          <Text style={styles.detailValue}>{formatDate(date)}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>VEHICLE</Text>

          <Text style={styles.detailValue} numberOfLines={1}>
            {fine.registrationNumber ?? "Not specified"}
          </Text>
        </View>
      </View>

      {/* LOCATION */}

      <View style={styles.locationRow}>
        <MaterialIcons name="location-on" size={17} color="#777" />

        <Text style={styles.locationText} numberOfLines={2}>
          {fine.location ?? fine.cameraLocation ?? "Location unavailable"}
        </Text>
      </View>

      {/* SPEED INFORMATION */}

      {fine.type === "speed_camera" && (
        <View style={styles.speedRow}>
          <View>
            <Text style={styles.speedLabel}>RECORDED SPEED</Text>

            <Text style={styles.speedValue}>
              {fine.recordedSpeed ?? fine.speed ?? "--"} km/h
            </Text>
          </View>

          <View>
            <Text style={styles.speedLabel}>SPEED LIMIT</Text>

            <Text style={styles.speedValue}>{fine.speedLimit ?? "--"} km/h</Text>
          </View>
        </View>
      )}

      {/* AMOUNT */}

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Amount Due</Text>

          {fine.dueDate && (
            <Text style={styles.dueDate}>Due {formatDate(fine.dueDate)}</Text>
          )}
        </View>

        <Text style={styles.amount}>{formatCurrency(amount)}</Text>
      </View>

      {/* PAY BUTTON */}

      <TouchableOpacity
        style={styles.payButton}
        activeOpacity={0.8}
        onPress={() => handlePay(fine)}
      >
        <MaterialIcons name="payments" size={19} color="#FFFFFF" />

        <Text style={styles.payButtonText}>Pay Now</Text>

        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: "#EAF1F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  loader: {
    marginBottom: 12,
  },

  loadingTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#003366",
  },

  loadingText: {
    marginTop: 5,
    fontSize: 13,
    color: "#777",
  },

  /* HEADER */

  header: {
    marginTop: 8,
    marginBottom: 18,
  },

  headerTitleRow: {
    flexDirection: "row",
  },

  headerAccent: {
    width: 4,
    borderRadius: 4,
    backgroundColor: "#003366",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#777",
    marginBottom: 4,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#003366",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#666",
  },

  /* ACCOUNT */

  accountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  accountIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#EAF1F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  accountInfo: {
    flex: 1,
  },

  accountLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#888",
    marginBottom: 2,
  },

  accountName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  accountId: {
    fontSize: 11,
    color: "#777",
    marginTop: 2,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF7EF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  verifiedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#2E7D32",
    marginLeft: 3,
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EAF1F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#777",
    marginBottom: 2,
  },

  summaryAmount: {
    fontSize: 25,
    fontWeight: "800",
    color: "#003366",
  },

  summaryDescription: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  /* STATS */

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EAF1F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  statIconWarning: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FDECEC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  statIconPaid: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EDF7EF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  statNumber: {
    fontSize: 21,
    fontWeight: "800",
    color: "#003366",
  },

  warningText: {
    color: "#C62828",
  },

  paidNumber: {
    color: "#2E7D32",
  },

  statLabel: {
    fontSize: 11,
    color: "#777",
    marginTop: 2,
  },

  /* INFO */

  infoCard: {
    backgroundColor: "#EAF1F7",
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 25,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: "#4D5D6B",
    fontSize: 12,
    lineHeight: 18,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#888",
    marginBottom: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#003366",
  },

  sectionCount: {
    fontSize: 12,
    color: "#777",
    marginBottom: 2,
  },

  /* FINE CARD */

  fineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 13,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  fineHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  fineTitleRow: {
    flexDirection: "row",
    flex: 1,
    marginRight: 8,
  },

  fineIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EAF1F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  fineTitleContainer: {
    flex: 1,
  },

  fineTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
    marginTop: 2,
  },

  reference: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  outstandingBadge: {
    backgroundColor: "#FFF4E5",
  },

  overdueBadge: {
    backgroundColor: "#FDECEC",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  outstandingText: {
    color: "#B26A00",
  },

  overdueText: {
    color: "#C62828",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },

  /* DETAILS */

  detailRow: {
    flexDirection: "row",
    marginBottom: 14,
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#999",
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    paddingRight: 8,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  locationText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
  },

  /* SPEED */

  speedRow: {
    backgroundColor: "#F7F8FA",
    borderRadius: 11,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  speedLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#999",
    marginBottom: 3,
  },

  speedValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#003366",
  },

  /* AMOUNT */

  amountRow: {
    backgroundColor: "#F7F8FA",
    borderRadius: 11,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  amountLabel: {
    fontSize: 12,
    color: "#777",
  },

  dueDate: {
    fontSize: 10,
    color: "#999",
    marginTop: 3,
  },

  amount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#003366",
  },

  /* BUTTONS */

  payButton: {
    backgroundColor: "#003366",
    borderRadius: 11,
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  payButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginHorizontal: 8,
  },

  payButtonDisabled: {
    opacity: 0.6,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
  },

  emptyIcon: {
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    lineHeight: 19,
  },

  emptySubtext: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },

  /* DATA FOOTER */

  dataFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  dataFooterText: {
    fontSize: 10,
    color: "#888",
    marginLeft: 5,
  },

  /* FOOTER */

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  footerText: {
    fontSize: 11,
    color: "#777",
    marginLeft: 5,
  },
});