export { VISION_MAX_BYTES, analyzeFoodImage, offlineVisionFallback } from "./vision";
export { compressImageFile } from "./compress-image";
export {
  humanizeFoodLabel,
  visionResultFromFood101,
  type FoodPrediction,
} from "./food101-map";
export {
  getVisionQuotaLimits,
  tryConsumeVisionQuota,
  type VisionQuotaDenialReason,
  type VisionQuotaResult,
} from "./vision-quota";
