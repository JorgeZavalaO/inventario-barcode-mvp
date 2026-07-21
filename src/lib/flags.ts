export const featureFlags = {
  get locationV2Enabled() {
    return process.env.INVENTORY_LOCATION_V2_ENABLED === "true";
  },
};
