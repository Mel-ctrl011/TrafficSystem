
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

const TOAST_COLORS = {
  success: {
    background: "#ECFDF3",
    border: "#A7E4C0",
    text: "#18794E",
    icon: "checkmark-circle",
  },
  error: {
    background: "#FEF3F2",
    border: "#F3C7C3",
    text: "#B42318",
    icon: "alert-circle",
  },
  info: {
    background: "#EAF3FA",
    border: "#C7DDED",
    text: "#0B4F8A",
    icon: "information-circle",
  },
} as const;

export default function Toast({
  visible,
  message,
  type = "info",
  duration = 3000,
  onHide,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-25)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (visible) {
      opacity.setValue(0);
      translateY.setValue(-25);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            onHide();
          }
        });
      }, duration);
    } else {
      opacity.setValue(0);
      translateY.setValue(-25);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, message, duration, opacity, translateY, onHide]);

  if (!visible) return null;

  const colors = TOAST_COLORS[type];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons
        name={colors.icon}
        size={23}
        color={colors.text}
      />

      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {type === "success"
            ? "Success"
            : type === "error"
            ? "Something went wrong"
            : "Notice"}
        </Text>

        <Text style={styles.message}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  textContainer: {
    flex: 1,
    marginLeft: 11,
  },

  title: {
    fontSize: 12,
    fontWeight: "800",
  },

  message: {
    marginTop: 3,
    color: "#344054",
    fontSize: 11,
    lineHeight: 16,
  },
});
