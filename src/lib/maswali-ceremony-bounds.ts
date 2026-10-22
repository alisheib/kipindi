/** Shared client/server input bounds for Millionea's written admin ceremonies. */
export const MASWALI_REASON_MIN = 5;
export const MASWALI_REASON_MAX = 300;
export const MASWALI_LICENCE_REF_MIN = 5;
export const MASWALI_LICENCE_REF_MAX = 500;

export const writtenLength = (value: string) => value.trim().replace(/\s+/g, " ").length;
export const reasonLengthOk = (value: string) => value.trim().length >= MASWALI_REASON_MIN && value.trim().length <= MASWALI_REASON_MAX;
export const pauseReasonLengthOk = (value: string) => writtenLength(value) >= MASWALI_REASON_MIN && writtenLength(value) <= MASWALI_REASON_MAX;
export const licenceRefLengthOk = (value: string) => writtenLength(value) >= MASWALI_LICENCE_REF_MIN && writtenLength(value) <= MASWALI_LICENCE_REF_MAX;
