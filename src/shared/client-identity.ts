import type { ClientIdentityType } from "./contracts";

type IdentityValidationResult = {
  normalizedValue: string | null;
  identityType: ClientIdentityType | null;
  isValid: boolean;
  error: string | null;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const normalizeIdentityNumber = (value: string | null | undefined) => {
  const digits = value ? onlyDigits(value) : "";
  return digits.length > 0 ? digits : null;
};

export const getClientIdentityTypeLabel = (identityType: ClientIdentityType | null) => {
  if (identityType === "vkn") {
    return "VKN";
  }

  if (identityType === "tckn") {
    return "T.C. Kimlik";
  }

  return "Belirtilmedi";
};

export const detectIdentityType = (
  identityNumber: string | null | undefined
): ClientIdentityType | null => {
  const normalized = normalizeIdentityNumber(identityNumber);

  if (!normalized) {
    return null;
  }

  if (normalized.length === 10) {
    return "vkn";
  }

  if (normalized.length === 11) {
    return "tckn";
  }

  return null;
};

export const isValidTckn = (identityNumber: string | null | undefined) => {
  const normalized = normalizeIdentityNumber(identityNumber);

  if (!normalized || !/^\d{11}$/.test(normalized) || normalized.startsWith("0")) {
    return false;
  }

  const digits = normalized.split("").map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  const eleventhDigit = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;

  return digits[9] === tenthDigit && digits[10] === eleventhDigit;
};

export const isValidVkn = (identityNumber: string | null | undefined) => {
  const normalized = normalizeIdentityNumber(identityNumber);

  if (!normalized || !/^\d{10}$/.test(normalized)) {
    return false;
  }

  const digits = normalized.split("").map(Number);
  const controlDigit = digits[9];
  const values = digits.slice(0, 9).map((digit, index) => {
    const offsetValue = digit + 10 - (index + 1);
    const modulo = offsetValue % 10;

    if (modulo === 9) {
      return 9;
    }

    return (modulo * 2 ** (10 - (index + 1))) % 9;
  });

  const total = values.reduce((sum, current) => sum + current, 0);
  const calculatedControlDigit = (10 - (total % 10)) % 10;

  return controlDigit === calculatedControlDigit;
};

export const validateIdentityInput = (
  identityType: ClientIdentityType | null | undefined,
  identityNumber: string | null | undefined
): IdentityValidationResult => {
  const normalizedValue = normalizeIdentityNumber(identityNumber);

  if (!identityType && !normalizedValue) {
    return {
      normalizedValue: null,
      identityType: null,
      isValid: true,
      error: null
    };
  }

  if (!identityType && normalizedValue) {
    return {
      normalizedValue,
      identityType: null,
      isValid: false,
      error: "Kimlik türü seçilmelidir."
    };
  }

  if (identityType && !normalizedValue) {
    return {
      normalizedValue: null,
      identityType,
      isValid: false,
      error: "Kimlik numarası girilmelidir."
    };
  }

  const detectedType = detectIdentityType(normalizedValue);
  if (!detectedType) {
    return {
      normalizedValue,
      identityType: identityType ?? null,
      isValid: false,
      error: "Kimlik numarası yalnızca 10 haneli VKN veya 11 haneli T.C. kimlik olabilir."
    };
  }

  if (identityType !== detectedType) {
    return {
      normalizedValue,
      identityType: identityType ?? null,
      isValid: false,
      error:
        identityType === "vkn"
          ? "VKN yalnızca 10 haneli olmalıdır."
          : "T.C. kimlik numarası yalnızca 11 haneli olmalıdır."
    };
  }

  if (identityType === "tckn" && !isValidTckn(normalizedValue)) {
    return {
      normalizedValue,
      identityType,
      isValid: false,
      error: "T.C. kimlik numarası doğrulaması geçmedi."
    };
  }

  if (identityType === "vkn" && !isValidVkn(normalizedValue)) {
    return {
      normalizedValue,
      identityType,
      isValid: false,
      error: "VKN doğrulaması geçmedi."
    };
  }

  return {
    normalizedValue,
    identityType,
    isValid: true,
    error: null
  };
};

export const inferIdentityFromValue = (
  identityNumber: string | null | undefined
): IdentityValidationResult => {
  const normalizedValue = normalizeIdentityNumber(identityNumber);
  const detectedType = detectIdentityType(normalizedValue);

  if (!normalizedValue) {
    return {
      normalizedValue: null,
      identityType: null,
      isValid: true,
      error: null
    };
  }

  if (!detectedType) {
    return {
      normalizedValue,
      identityType: null,
      isValid: false,
      error: "Kimlik numarası 10 veya 11 haneli olmalıdır."
    };
  }

  return validateIdentityInput(detectedType, normalizedValue);
};
