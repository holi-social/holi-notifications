import { Novu } from "./deps.ts";

export const testConfig = {
  port: 8005,
  fake: false,
  novuConfig: {
    apiKey: "TEST-API-KEY",
    apiUrl: "TEST-API-URL",
  },
};
export const subscriberId = "testSubscriberId";
export const novu = new Novu(testConfig.novuConfig.apiKey);
const novuPreferencesAllEnabled = {
  enabled: true,
  channels: {
    "push": true,
    "email": true,
    "in_app": true,
  },
};
export const testGlobalPreferences = [{
  preference: novuPreferencesAllEnabled,
}];
export const testWorkflowPreferences = [
  {
    preference: {
      enabled: true,
      channels: {
        "push": false,
        "in_app": true,
      },
    },
    template: {
      _id: "space-new-post",
      tags: ["CATEGORY_SPACES", "SPACE_NEW_POST"],
    },
  },
  {
    preference: novuPreferencesAllEnabled,
    template: {
      _id: "space-membership-request-accept",
      tags: ["CATEGORY_SPACES", "SPACE_MEMBERSHIP_REQUEST"],
    },
  },
  {
    preference: {
      enabled: true,
      channels: {
        "push": true,
        "in_app": true,
      },
    },
    template: {
      _id: "space-membership-request-decline",
      tags: ["CATEGORY_SPACES", "SPACE_MEMBERSHIP_REQUEST"],
    },
  },
];
export const preferencesAllEnabled = {
  "push": true,
  "email": true,
};
