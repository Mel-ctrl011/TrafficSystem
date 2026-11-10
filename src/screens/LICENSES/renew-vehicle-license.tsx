
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";

type RenewalRequest = {
  vehicleId: string;
  requestId: string;
  status: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: unknown;
  reviewedBy?: string;
};

type Feedback = {
  title: string;
  message: string;
};

const RENEWAL_WINDOW_DAYS = 30;

export default function RenewVehicleLicenseScreen() {
  const { user } = useAuth();

  const citizenId = user?.idNumber;
  const citizenName = user?.fullName || "";

  const [renewalRequests, setRenewalRequests] = useState<
    Record<string, RenewalRequest>
  >({});

  const [loadingRequests, setLoadingRequests] = useState(true);

  const [submittingVehicleId, setSubmittingVehicleId] = useState<
    string | null
  >(null);

  // Live clock: updates every second.
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Cross-platform confirmation modal.
  const [confirmVehicle, setConfirmVehicle] = useState<any | null>(null);

  // Cross-platform feedback modal.
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Listen for renewal decisions in Firestore.
  useEffect(() => {
    console.log(
      "[Renewal Debug] Screen mounted. Citizen ID:",
      user?.idNumber
    );

    if (!user?.idNumber) {
      setRenewalRequests({});
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);

    const requestsQuery = query(
      collection(db, "vehicleRenewalRequests"),
      where("citizenId", "==", user.idNumber)
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        console.log(
          "[Renewal Debug] Snapshot received:",
          snapshot.size
        );

        const requests: Record<string, RenewalRequest> = {};

        snapshot.docs.forEach((requestDoc) => {
          const data = requestDoc.data();
          const vehicleId = data.vehicleId || requestDoc.id;

          requests[vehicleId] = {
            vehicleId,
            requestId: requestDoc.id,
            status: data.status || "Pending",
            rejectionReason: data.rejectionReason || "",
            submittedAt: data.submittedAt || "",
            reviewedAt: data.reviewedAt,
            reviewedBy: data.reviewedBy || "",
          };

          console.log("[Renewal Debug] Request loaded:", {
            requestId: requestDoc.id,
            vehicleId,
            status: data.status,
          });
        });

        setRenewalRequests(requests);
        setLoadingRequests(false);
      },
      (error) => {
        console.error(
          "[Renewal Debug] Firestore listener error:",
          error.code,
          error.message
        );

        setLoadingRequests(false);

        setFeedback({
          title: "Unable to load renewal status",
          message: error.message,
        });
      }
    );

    return () => unsubscribe();
  }, [user?.idNumber]);

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>
          Loading your account...
        </Text>
      </View>
    );
  }

  const vehicles = user.vehicles ?? [];

  // Check whether the vehicle is eligible for renewal.
  function getRenewalInfo(expiryValue: any) {
    const expiryDate = parseExpiryDate(expiryValue);

    if (!expiryDate) {
      return {
        validDate: false,
        eligible: false,
        expired: false,
        daysRemaining: null as number | null,
        countdown: null,
        renewalDate: null as Date | null,
      };
    }

    const now = new Date(currentTime);

    // Use local calendar dates to avoid date-only timezone errors.
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const expiryDay = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate()
    );

    const renewalDate = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate() - RENEWAL_WINDOW_DAYS
    );

    const daysRemaining =
      Math.round(
        (Date.UTC(
          expiryDay.getFullYear(),
          expiryDay.getMonth(),
          expiryDay.getDate()
        ) -
          Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          )) /
          86400000
      );

    const eligible = now.getTime() >= renewalDate.getTime();

    const expired = daysRemaining < 0;

    // Live countdown until the beginning of the renewal window.
    const remainingMilliseconds = Math.max(
      0,
      renewalDate.getTime() - currentTime
    );

    const totalSeconds = Math.floor(
      remainingMilliseconds / 1000
    );

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      validDate: true,
      eligible,
      expired,
      daysRemaining,
      renewalDate,
      countdown: {
        days,
        hours,
        minutes,
        seconds,
      },
    };
  }

  function showFeedback(title: string, message: string) {
    setFeedback({ title, message });
  }

  function submitRenewal(vehicle: any) {
    const vehicleId = vehicle.vehicleId;

    console.log("[Renewal Debug] Resubmit button tapped:", {
      vehicleId,
      registrationNumber: vehicle.registrationNumber,
    });

    if (!vehicleId) {
      showFeedback(
        "Vehicle information missing",
        "This vehicle does not have a vehicle ID. Please contact support."
      );
      return;
    }

    if (!user.idNumber) {
      showFeedback(
        "Account information missing",
        "Your ID number could not be found. Please sign in again."
      );
      return;
    }

    const renewalInfo = getRenewalInfo(
      vehicle.licenceDisk?.expiryDate
    );

    if (!renewalInfo.validDate) {
      showFeedback(
        "Expiry date unavailable",
        "We cannot calculate your vehicle's renewal eligibility because its licence expiry date is missing or invalid."
      );
      return;
    }

    if (!renewalInfo.eligible) {
      showFeedback(
        "Renewal not available yet",
        "Your vehicle licence is still outside the 30-day renewal window. Please wait until " +
          formatDate(renewalInfo.renewalDate?.toISOString()) +
          " before submitting a renewal request."
      );
      return;
    }

    const existingRequest = renewalRequests[vehicleId];

    const currentStatus = existingRequest
      ? normalizeStatus(existingRequest.status)
      : null;

    if (currentStatus === "Pending") {
      showFeedback(
        "Request already submitted",
        "Your renewal request is awaiting administrative review."
      );
      return;
    }

    if (currentStatus === "Approved") {
      showFeedback(
        "Already approved",
        "This vehicle's renewal request has already been approved."
      );
      return;
    }

    // Use a Modal instead of Alert.alert().
    // This works more consistently on Expo Web and native.
    setConfirmVehicle(vehicle);
  }

  async function saveRenewal(vehicle: any) {
    const vehicleId = vehicle.vehicleId;

    try {
      setSubmittingVehicleId(vehicleId);
      setConfirmVehicle(null);

      // Recheck eligibility immediately before writing.
      const renewalInfo = getRenewalInfo(
        vehicle.licenceDisk?.expiryDate
      );

      if (!renewalInfo.validDate || !renewalInfo.eligible) {
        showFeedback(
          "Renewal unavailable",
          "This vehicle is not currently eligible for renewal."
        );
        return;
      }

      const existingRequest = renewalRequests[vehicleId];

      if (
        existingRequest &&
        normalizeStatus(existingRequest.status) === "Pending"
      ) {
        showFeedback(
          "Request already submitted",
          "Your renewal request is awaiting administrative review."
        );
        return;
      }

      if (
        existingRequest &&
        normalizeStatus(existingRequest.status) === "Approved"
      ) {
        showFeedback(
          "Already approved",
          "This vehicle's renewal request has already been approved."
        );
        return;
      }

      // Reuse the original document ID when resubmitting.
      // This prevents accidental duplicate documents.
      const requestId =
        existingRequest?.requestId || vehicleId;

      const requestRef = doc(
        db,
        "vehicleRenewalRequests",
        requestId
      );

      const now = new Date().toISOString();

      console.log(
        "[Renewal Debug] Saving request:",
        requestRef.path
      );

      await setDoc(requestRef, {
        citizenId: citizenId!,
        fullName: citizenName,
        vehicleId,
        registrationNumber: vehicle.registrationNumber || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        licenceDisk: vehicle.licenceDisk || null,
        submittedAt: now,
        status: "Pending",
        rejectionReason: "",
        reviewedAt: null,
        reviewedBy: "",
        updatedAt: now,
      });

      console.log(
        "[Renewal Debug] Request successfully submitted."
      );

      showFeedback(
        "Request submitted",
        "Your vehicle licence renewal request has been submitted successfully and is awaiting administrative review."
      );
    } catch (error: any) {
      console.error(
        "[Renewal Debug] Submission failed:",
        error?.code,
        error?.message,
        error
      );

      showFeedback(
        "Submission failed",
        error?.message ||
          "Unable to submit your request. Please try again."
      );
    } finally {
      setSubmittingVehicleId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={styles.title}>
          Renew Vehicle Licence
        </Text>

        <Text style={styles.subtitle}>
          Manage your vehicle licence disks and track renewal applications.
        </Text>

        {loadingRequests && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#003366" />
            <Text style={styles.loadingBannerText}>
              Checking your renewal requests...
            </Text>
          </View>
        )}

        {vehicles.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons
              name="directions-car"
              size={60}
              color="#999"
            />
            <Text style={styles.emptyText}>
              No registered vehicles found.
            </Text>
          </View>
        ) : (
          vehicles.map((vehicle: any, index: number) => {
            const vehicleId = vehicle.vehicleId;

            const request = vehicleId
              ? renewalRequests[vehicleId]
              : undefined;

            const requestStatus = request
              ? normalizeStatus(request.status)
              : null;

            const renewalInfo = getRenewalInfo(
              vehicle.licenceDisk?.expiryDate
            );

            const isSubmitting =
              submittingVehicleId === vehicleId;

            const alreadyPending =
              requestStatus === "Pending";

            const alreadyApproved =
              requestStatus === "Approved";

            const canRenew =
              renewalInfo.validDate &&
              renewalInfo.eligible &&
              !alreadyPending &&
              !alreadyApproved;

            const licenceStatus = !renewalInfo.validDate
              ? "Expiry Date Unavailable"
              : renewalInfo.expired
              ? "Licence Expired"
              : "Licence Valid";

            const statusColor = !renewalInfo.validDate
              ? "#64748B"
              : renewalInfo.expired
              ? "#D32F2F"
              : "#2E7D32";

            console.log("[Renewal Debug] Vehicle:", {
              vehicleId,
              registrationNumber: vehicle.registrationNumber,
              requestStatus,
              eligible: renewalInfo.eligible,
              daysRemaining: renewalInfo.daysRemaining,
            });

            return (
              <View
                key={vehicleId || index}
                style={styles.card}
              >
                {/* Vehicle heading */}
                <View style={styles.header}>
                  <View style={styles.carIcon}>
                    <MaterialIcons
                      name="directions-car"
                      size={30}
                      color="#003366"
                    />
                  </View>

                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.vehicle}>
                      {vehicle.make} {vehicle.model}
                    </Text>

                    <Text style={styles.registration}>
                      Registration:{" "}
                      {vehicle.registrationNumber || "Not provided"}
                    </Text>
                  </View>
                </View>

                {/* Vehicle licence information */}
                <Row
                  label="Licence Disk"
                  value={vehicle.licenceDisk?.number}
                />

                <Row
                  label="Licence Expiry"
                  value={formatDate(
                    vehicle.licenceDisk?.expiryDate
                  )}
                />

                <Row
                  label="Time Remaining"
                  value={
                    renewalInfo.validDate
                      ? renewalInfo.expired
                        ? `${Math.abs(
                            renewalInfo.daysRemaining || 0
                          )} days expired`
                        : `${renewalInfo.daysRemaining} days`
                      : "Unavailable"
                  }
                />

                {/* Licence status */}
                <View
                  style={[
                    styles.status,
                    {
                      backgroundColor: !renewalInfo.validDate
                        ? "#F0F3F7"
                        : renewalInfo.expired
                        ? "#FDECEA"
                        : "#E8F5E9",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={
                      !renewalInfo.validDate
                        ? "info-outline"
                        : renewalInfo.expired
                        ? "warning"
                        : "verified"
                    }
                    size={24}
                    color={statusColor}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColor },
                    ]}
                  >
                    {licenceStatus}
                  </Text>
                </View>

                {/* Renewal request status */}
                {requestStatus && (
                  <View
                    style={[
                      styles.requestStatusCard,
                      requestStatus === "Pending" &&
                        styles.pendingCard,
                      requestStatus === "Approved" &&
                        styles.approvedCard,
                      requestStatus === "Rejected" &&
                        styles.rejectedCard,
                    ]}
                  >
                    <View style={styles.requestStatusHeading}>
                      <MaterialIcons
                        name={
                          requestStatus === "Pending"
                            ? "hourglass-top"
                            : requestStatus === "Approved"
                            ? "check-circle"
                            : "cancel"
                        }
                        size={23}
                        color={
                          requestStatus === "Pending"
                            ? "#946200"
                            : requestStatus === "Approved"
                            ? "#237A3B"
                            : "#C62828"
                        }
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestStatusLabel}>
                          Renewal Request
                        </Text>

                        <Text
                          style={[
                            styles.requestStatusValue,
                            requestStatus === "Pending" && {
                              color: "#946200",
                            },
                            requestStatus === "Approved" && {
                              color: "#237A3B",
                            },
                            requestStatus === "Rejected" && {
                              color: "#C62828",
                            },
                          ]}
                        >
                          {requestStatus}
                        </Text>
                      </View>
                    </View>

                    {requestStatus === "Pending" && (
                      <Text style={styles.requestStatusDescription}>
                        Your request is waiting for administrative review.
                      </Text>
                    )}

                    {requestStatus === "Approved" && (
                      <Text style={styles.requestStatusDescription}>
                        Your renewal request has been approved. Follow any
                        further instructions from the relevant authority.
                      </Text>
                    )}

                    {requestStatus === "Rejected" && (
                      <>
                        <Text style={styles.requestStatusDescription}>
                          Your renewal request was not approved.
                        </Text>

                        {!!request?.rejectionReason && (
                          <View style={styles.reasonBox}>
                            <Text style={styles.reasonTitle}>
                              Reason provided by administration
                            </Text>

                            <Text style={styles.reasonText}>
                              {request.rejectionReason}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {!!request?.submittedAt && (
                      <Text style={styles.submittedDate}>
                        Submitted: {formatDate(request.submittedAt)}
                      </Text>
                    )}
                  </View>
                )}

                {/* Smart renewal countdown */}
                {!requestStatus &&
                  renewalInfo.validDate &&
                  !renewalInfo.eligible && (
                    <View style={styles.countdownCard}>
                      <View style={styles.countdownHeading}>
                        <MaterialIcons
                          name="verified-user"
                          size={25}
                          color="#237A3B"
                        />

                        <Text style={styles.countdownTitle}>
                          No action required
                        </Text>
                      </View>

                      <Text style={styles.countdownDescription}>
                        Your vehicle licence is still valid. Renewal will
                        become available 30 days before expiry.
                      </Text>

                      <View style={styles.timerHeader}>
                        <MaterialIcons
                          name="hourglass-top"
                          size={19}
                          color="#003366"
                        />

                        <Text style={styles.timerTitle}>
                          Renewal opens in
                        </Text>
                      </View>

                      <View style={styles.timerContainer}>
                        <TimerUnit
                          value={renewalInfo.countdown!.days}
                          label="Days"
                        />

                        <TimerUnit
                          value={renewalInfo.countdown!.hours}
                          label="Hours"
                        />

                        <TimerUnit
                          value={renewalInfo.countdown!.minutes}
                          label="Minutes"
                        />

                        <TimerUnit
                          value={renewalInfo.countdown!.seconds}
                          label="Seconds"
                        />
                      </View>

                      <Text style={styles.renewalDate}>
                        Renewal available from{" "}
                        {formatDate(
                          renewalInfo.renewalDate?.toISOString()
                        )}
                      </Text>
                    </View>
                  )}

                {/* Missing expiry date */}
                {!renewalInfo.validDate && (
                  <View style={styles.warningCard}>
                    <MaterialIcons
                      name="warning"
                      size={21}
                      color="#946200"
                    />

                    <Text style={styles.warningText}>
                      We cannot determine your renewal eligibility because
                      your licence expiry date is unavailable. Please
                      update your vehicle information.
                    </Text>
                  </View>
                )}

                {/* Rejected but still outside renewal window */}
                {requestStatus === "Rejected" &&
                  renewalInfo.validDate &&
                  !renewalInfo.eligible && (
                    <View style={styles.blockedCard}>
                      <Text style={styles.blockedTitle}>
                        Resubmission unavailable
                      </Text>

                      <Text style={styles.blockedText}>
                        Your previous request was rejected, but your
                        vehicle is still outside the 30-day renewal window.
                        You can resubmit when renewal becomes available.
                      </Text>

                      <View style={styles.timerContainer}>
                        <TimerUnit
                          value={renewalInfo.countdown!.days}
                          label="Days"
                        />

                        <TimerUnit
                          value={renewalInfo.countdown!.hours}
                          label="Hours"
                        />

                        <TimerUnit
                          value={renewalInfo.countdown!.minutes}
                          label="Minutes"
                        />

                        <TimerUnit
                          value={renewalInfo.countdown!.seconds}
                          label="Seconds"
                        />
                      </View>
                    </View>
                  )}

                {/* Renewal action */}
                {alreadyPending || alreadyApproved ? (
                  <View style={styles.disabledButton}>
                    <MaterialIcons
                      name={
                        alreadyApproved
                          ? "check-circle"
                          : "schedule"
                      }
                      size={21}
                      color="#fff"
                    />

                    <Text style={styles.buttonText}>
                      {alreadyApproved
                        ? "Request Approved"
                        : "Awaiting Review"}
                    </Text>
                  </View>
                ) : !canRenew ? (
                  <View style={styles.unavailableButton}>
                    <MaterialIcons
                      name={
                        renewalInfo.validDate
                          ? "lock-clock"
                          : "lock"
                      }
                      size={21}
                      color="#64748B"
                    />

                    <Text style={styles.unavailableButtonText}>
                      Renewal Unavailable
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      isSubmitting && styles.buttonDisabled,
                    ]}
                    disabled={isSubmitting}
                    onPress={() => submitRenewal(vehicle)}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <MaterialIcons
                        name="refresh"
                        size={22}
                        color="#fff"
                      />
                    )}

                    <Text style={styles.buttonText}>
                      {isSubmitting
                        ? "Submitting..."
                        : requestStatus === "Rejected"
                        ? "Resubmit Renewal Request"
                        : "Renew Licence Disk"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Cross-platform confirmation modal */}
      <Modal
        visible={!!confirmVehicle}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVehicle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <MaterialIcons
                name="description"
                size={30}
                color="#003366"
              />
            </View>

            <Text style={styles.modalTitle}>
              Confirm renewal request
            </Text>

            <Text style={styles.modalDescription}>
              {confirmVehicle &&
              renewalRequests[confirmVehicle.vehicleId] &&
              normalizeStatus(
                renewalRequests[confirmVehicle.vehicleId].status
              ) === "Rejected"
                ? "Your previous request was rejected. Would you like to resubmit your vehicle licence renewal request?"
                : "Would you like to submit a vehicle licence renewal request for administrative review?"}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmVehicle(null)}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  if (confirmVehicle) {
                    void saveRenewal(confirmVehicle);
                  }
                }}
              >
                <Text style={styles.confirmButtonText}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback modal */}
      <Modal
        visible={!!feedback}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedback(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialIcons
              name="info-outline"
              size={38}
              color="#003366"
            />

            <Text style={styles.modalTitle}>
              {feedback?.title}
            </Text>

            <Text style={styles.modalDescription}>
              {feedback?.message}
            </Text>

            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => setFeedback(null)}
            >
              <Text style={styles.confirmButtonText}>
                Okay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --------------------------------------------------
// DATE HELPERS
// --------------------------------------------------

function parseExpiryDate(value: any): Date | null {
  if (!value) return null;

  let date: Date;

  // Firestore Timestamp.
  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    // Handle YYYY-MM-DD without UTC timezone shifting.
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
    } else {
      date = new Date(value);
    }
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function normalizeStatus(status?: string) {
  const value = (status || "").trim().toLowerCase();

  if (value === "approved" || value === "accepted") {
    return "Approved";
  }

  if (value === "rejected" || value === "declined") {
    return "Rejected";
  }

  if (value === "pending") {
    return "Pending";
  }

  return status || "Unknown";
}

function formatDate(value?: any) {
  if (!value) return "Not provided";

  const date = parseExpiryDate(value);

  if (!date) return String(value);

  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

function Row({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

function TimerUnit({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.timerUnit}>
      <Text style={styles.timerNumber}>
        {String(value).padStart(2, "0")}
      </Text>

      <Text style={styles.timerLabel}>
        {label}
      </Text>
    </View>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#003366",
  },
  subtitle: {
    color: "#666",
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 20,
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#EAF2FA",
    borderRadius: 10,
    marginBottom: 16,
  },
  loadingBannerText: {
    color: "#003366",
    marginLeft: 10,
    fontSize: 13,
  },
  empty: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 15,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 15,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  carIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EAF2FA",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#003366",
  },
  registration: {
    color: "#666",
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 8,
  },
  label: {
    color: "#666",
    fontWeight: "600",
  },
  value: {
    flexShrink: 1,
    textAlign: "right",
    fontWeight: "700",
    color: "#263238",
  },
  status: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    marginLeft: 10,
    fontWeight: "700",
    flex: 1,
  },

  // Live countdown
  countdownCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#F0F7F2",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#C8E5D0",
  },
  countdownHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  countdownTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#237A3B",
  },
  countdownDescription: {
    marginTop: 10,
    color: "#4D5968",
    fontSize: 13,
    lineHeight: 20,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    marginBottom: 10,
  },
  timerTitle: {
    fontWeight: "800",
    color: "#003366",
    fontSize: 13,
  },
  timerContainer: {
    flexDirection: "row",
    gap: 7,
    marginTop: 5,
  },
  timerUnit: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 9,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#DCE5EF",
  },
  timerNumber: {
    fontSize: 21,
    fontWeight: "900",
    color: "#003366",
  },
  timerLabel: {
    marginTop: 4,
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  renewalDate: {
    marginTop: 13,
    color: "#237A3B",
    fontWeight: "700",
    fontSize: 12,
  },

  // Request status
  requestStatusCard: {
    marginTop: 16,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingCard: {
    backgroundColor: "#FFF8E6",
    borderColor: "#F0D89B",
  },
  approvedCard: {
    backgroundColor: "#EAF7ED",
    borderColor: "#B8E0C1",
  },
  rejectedCard: {
    backgroundColor: "#FFF0F0",
    borderColor: "#F1C0C0",
  },
  requestStatusHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requestStatusLabel: {
    color: "#526174",
    fontSize: 12,
  },
  requestStatusValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  requestStatusDescription: {
    color: "#4D5968",
    lineHeight: 19,
    fontSize: 13,
    marginTop: 12,
  },
  reasonBox: {
    marginTop: 12,
    padding: 11,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  reasonTitle: {
    fontWeight: "700",
    fontSize: 12,
    color: "#8F2020",
    marginBottom: 5,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5E2525",
  },
  submittedDate: {
    marginTop: 12,
    fontSize: 11,
    color: "#697586",
  },

  // Warnings
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 16,
    padding: 13,
    backgroundColor: "#FFF8E6",
    borderRadius: 10,
  },
  warningText: {
    flex: 1,
    color: "#795B18",
    fontSize: 12,
    lineHeight: 19,
  },
  blockedCard: {
    marginTop: 16,
    padding: 15,
    backgroundColor: "#FFF8E6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0D89B",
  },
  blockedTitle: {
    color: "#946200",
    fontSize: 15,
    fontWeight: "800",
  },
  blockedText: {
    color: "#67552C",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  // Buttons
  button: {
    marginTop: 20,
    backgroundColor: "#003366",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  disabledButton: {
    marginTop: 20,
    backgroundColor: "#718096",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableButton: {
    marginTop: 20,
    backgroundColor: "#EDF1F5",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableButtonText: {
    color: "#64748B",
    fontWeight: "700",
    marginLeft: 10,
    fontSize: 14,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 15,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#EAF2FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    color: "#003366",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  modalDescription: {
    color: "#64748B",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 11,
    backgroundColor: "#EDF1F5",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#526174",
    fontWeight: "700",
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 11,
    backgroundColor: "#003366",
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  feedbackButton: {
    width: "100%",
    padding: 14,
    borderRadius: 11,
    backgroundColor: "#003366",
    alignItems: "center",
    marginTop: 22,
  },
});
