
import React, { useCallback, useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useFocusEffect } from "@react-navigation/native";

/* =========================================================
   TYPES
========================================================= */

interface PendingAppointmentToast {
  appointmentId: string;
  appointmentNumber: string;
  createdAt: number;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AppointmentToast() {
  const [message, setMessage] = useState<string | null>(null);

  /* =======================================================
     CHECK FOR NEW APPOINTMENT WHEN HOME SCREEN IS FOCUSED
  ======================================================= */

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      let notificationTimer:
        ReturnType<typeof setTimeout> | undefined;

      let hideToastTimer:
        ReturnType<typeof setTimeout> | undefined;

      const checkPendingAppointment = async () => {
        try {
          console.log(
            "[AppointmentToast] Checking pending notification..."
          );

          const storedData = await AsyncStorage.getItem(
            "pendingAppointmentToast"
          );

          if (!storedData || cancelled) {
            console.log(
              "[AppointmentToast] No pending appointment."
            );
            return;
          }

          const appointment: PendingAppointmentToast =
            JSON.parse(storedData);

          if (
            !appointment.appointmentId ||
            !appointment.appointmentNumber
          ) {
            console.warn(
              "[AppointmentToast] Invalid notification data."
            );

            await AsyncStorage.removeItem(
              "pendingAppointmentToast"
            );

            return;
          }

          console.log(
            "[AppointmentToast] New appointment detected:",
            appointment.appointmentNumber
          );

          /* -----------------------------------------------
             START 30-SECOND COUNTDOWN
          ----------------------------------------------- */

          notificationTimer = setTimeout(async () => {
            if (cancelled) return;

            try {
              // Consume the marker when the notification
              // is actually ready to appear.
              const latestData =
                await AsyncStorage.getItem(
                  "pendingAppointmentToast"
                );

              if (!latestData || cancelled) return;

              const latestAppointment =
                JSON.parse(latestData) as PendingAppointmentToast;

              // Make sure this is still the same appointment.
              if (
                latestAppointment.appointmentId !==
                appointment.appointmentId
              ) {
                return;
              }

              await AsyncStorage.removeItem(
                "pendingAppointmentToast"
              );

              if (cancelled) return;

              console.log(
                "[AppointmentToast] Displaying appointment toast."
              );

              setMessage(
                `Your appointment ${appointment.appointmentNumber} has been confirmed.`
              );

              /* -------------------------------------------
                 HIDE AFTER 5 SECONDS
              ------------------------------------------- */

              hideToastTimer = setTimeout(() => {
                if (!cancelled) {
                  setMessage(null);
                }
              }, 5000);

            } catch (error) {
              console.error(
                "[AppointmentToast] Notification error:",
                error
              );
            }
          }, 30000);

        } catch (error) {
          console.error(
            "[AppointmentToast] Failed to check notification:",
            error
          );
        }
      };

      checkPendingAppointment();

      /* -----------------------------------------------
         CLEANUP
      ----------------------------------------------- */

      return () => {
        cancelled = true;

        if (notificationTimer) {
          clearTimeout(notificationTimer);
        }

        if (hideToastTimer) {
          clearTimeout(hideToastTimer);
        }
      };
    }, [])
  );

  /* =======================================================
     TOAST UI
  ======================================================= */

  if (!message) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          Appointment confirmed
        </Text>

        <Text style={styles.description}>
          {message}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => setMessage(null)}
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 25,
    left: 16,
    right: 16,

    flexDirection: "row",
    alignItems: "center",

    padding: 16,

    backgroundColor: "#FFFFFF",
    borderRadius: 16,

    elevation: 8,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    zIndex: 999,
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: "#DCFCE7",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },

  checkIcon: {
    fontSize: 23,
    fontWeight: "800",
    color: "#16A34A",
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  description: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },

  closeButton: {
    paddingHorizontal: 5,
    paddingVertical: 3,
  },

  closeText: {
    fontSize: 23,
    color: "#94A3B8",
  },
});
