
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
} from "firebase/firestore";

// ==========================================================
// CITIZEN DETAILS VERIFICATION
// ==========================================================

export async function verifyUser(
  idNumber: string,
  phone: string
) {
  try {
    const ref = doc(db, "citizens", idNumber);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        success: false,
        message: "User not found in system.",
      };
    }

    const data = snap.data();

    if (data.phone !== phone) {
      return {
        success: false,
        message: "Phone number does not match records.",
      };
    }

    // Do not allow an already activated account
    // to go through registration again.
    if (data.accountActive === true) {
      return {
        success: false,
        alreadyActivated: true,
        message:
          "This citizen account has already been activated. Please use Login.",
      };
    }

    return {
      success: true,
      message: "Citizen details verified successfully.",
    };
  } catch (error: any) {
    console.log("verifyUser error:", error);

    return {
      success: false,
      message: error?.message || "Verification failed.",
    };
  }
}

// ==========================================================
// FIND A DEVICE THAT IS ALREADY REGISTERED
// ==========================================================

export async function findRegisteredDevice(device: any) {
  try {
    if (!device?.deviceId) {
      return {
        success: false,
        found: false,
        message: "Unable to identify this device.",
      };
    }

    const citizensRef = collection(db, "citizens");

    const registeredQuery = query(
      citizensRef,
      where("registeredDeviceId", "==", device.deviceId)
    );

    const result = await getDocs(registeredQuery);

    if (result.empty) {
      return {
        success: true,
        found: false,
        message: "This device has not been registered.",
      };
    }

    const citizenDoc = result.docs[0];
    const citizenData = citizenDoc.data();

    if (citizenData.accountActive !== true) {
      return {
        success: true,
        found: false,
        message: "The linked account is not active.",
      };
    }

    return {
      success: true,
      found: true,
      userId: citizenDoc.id,
      fullName:
        citizenData.fullName ||
        citizenData.name ||
        "Registered Citizen",
      device: citizenData.registeredDevice || null,
      message: "This device is already registered.",
    };
  } catch (error: any) {
    console.log("findRegisteredDevice error:", error);

    return {
      success: false,
      found: false,
      message:
        error?.message || "Unable to check device registration.",
    };
  }
}

// ==========================================================
// ACCOUNT ACTIVATION / DEVICE REGISTRATION
// Called ONLY after OTP confirmation
// ==========================================================

export async function activateUser(
  idNumber: string,
  device: any
) {
  try {
    if (!device?.deviceId) {
      return {
        success: false,
        message: "Unable to identify this device.",
      };
    }

    const ref = doc(db, "citizens", idNumber);

    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);

      if (!snap.exists()) {
        return {
          success: false,
          message: "User not found in system.",
        };
      }

      const data = snap.data();
      const deviceId = device.deviceId;

      const devices = data.devices || {};
      const registeredDevice = data.registeredDevice;

      const existingRegisteredId =
        data.registeredDeviceId ||
        registeredDevice?.deviceId ||
        (Object.keys(devices).length === 1
          ? Object.keys(devices)[0]
          : null);

      // Never allow another device to take over.
      if (
        existingRegisteredId &&
        existingRegisteredId !== deviceId
      ) {
        return {
          success: false,
          message:
            "This account is already registered to another device. Please contact support.",
        };
      }

      if (Object.keys(devices).length > 1 && !existingRegisteredId) {
        return {
          success: false,
          message:
            "Multiple devices are associated with this account. Please contact support.",
        };
      }

      const now = new Date().toISOString();

      const deviceDetails = {
        deviceId,
        model: device.model || "Unknown device",
        os: device.os || "Unknown",
        osVersion: device.osVersion || "Unknown",
        firstSeen:
          registeredDevice?.firstSeen ||
          devices[deviceId]?.firstSeen ||
          now,
        trusted: true,
      };

      transaction.update(ref, {
        // New searchable field for device recognition.
        registeredDeviceId: deviceId,

        // Keep the existing registration structure.
        registeredDevice: deviceDetails,
        [`devices.${deviceId}`]: deviceDetails,

        verified: true,
        accountActive: true,
        lastLoginDevice: deviceId,
        activatedAt: data.activatedAt || now,
      });

      return {
        success: true,
        message: "Your account has been activated successfully.",
      };
    });

    return result;
  } catch (error: any) {
    console.log("activateUser error:", error);

    return {
      success: false,
      message: error?.message || "Account activation failed.",
    };
  }
}

// ==========================================================
// LOGIN / DEVICE CHECK
// ==========================================================

export async function verifyLogin(
  idNumber: string,
  device: any
) {
  try {
    if (!device?.deviceId) {
      return {
        success: false,
        message: "Unable to identify this device.",
      };
    }

    const ref = doc(db, "citizens", idNumber);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        success: false,
        message: "User not found.",
      };
    }

    const data = snap.data();

    if (data.accountActive !== true) {
      return {
        success: false,
        message: "Your account has not been activated yet.",
      };
    }

    const deviceId = device.deviceId;
    const devices = data.devices || {};

    const allowedDeviceId =
      data.registeredDeviceId ||
      data.registeredDevice?.deviceId ||
      (Object.keys(devices).length === 1
        ? Object.keys(devices)[0]
        : null);

    if (!allowedDeviceId || allowedDeviceId !== deviceId) {
      await runTransaction(db, async (transaction) => {
        const latestSnap = await transaction.get(ref);

        if (!latestSnap.exists()) return;

        transaction.update(ref, {
          [`suspiciousDevices.${deviceId}`]: {
            model: device.model || "Unknown device",
            os: device.os || "Unknown",
            time: new Date().toISOString(),
            reason: "Unregistered device login attempt",
          },
        });
      });

      return {
        success: false,
        message:
          "This device is not registered to your account. Please use your registered device.",
      };
    }

    await runTransaction(db, async (transaction) => {
      const latestSnap = await transaction.get(ref);

      if (!latestSnap.exists()) {
        throw new Error("User not found.");
      }

      const latestData = latestSnap.data();

      if (latestData.accountActive !== true) {
        throw new Error("Your account is not active.");
      }

      const latestDevices = latestData.devices || {};

      const latestRegisteredId =
        latestData.registeredDeviceId ||
        latestData.registeredDevice?.deviceId ||
        (Object.keys(latestDevices).length === 1
          ? Object.keys(latestDevices)[0]
          : null);

      if (latestRegisteredId !== deviceId) {
        throw new Error(
          "This device is not registered to your account."
        );
      }

      transaction.update(ref, {
        lastLoginDevice: deviceId,
        lastLoginAt: new Date().toISOString(),
      });
    });

    return {
      success: true,
      message: "Login successful.",
      userId: idNumber,
    };
  } catch (error: any) {
    console.log("verifyLogin error:", error);

    return {
      success: false,
      message: error?.message || "Login failed.",
    };
  }
}
