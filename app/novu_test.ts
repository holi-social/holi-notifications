import {
  afterEach,
  assertEquals,
  assertRejects,
  assertSpyCall,
  beforeEach,
  describe,
  it,
  Stub,
} from "./dev_deps.ts";
import { GraphQLError } from "./deps.ts";

import { fetchPreferences } from "./novu.ts";
import {
  stubNovuGlobalPreferences,
  stubNovuWorkflowPreferences,
} from "./test_helpers.ts";
import { novu, preferencesAllEnabled, subscriberId } from "./test_data.ts";

describe("novu", () => {
  let novuGlobalPreferenceStub: Stub;
  let novuPreferenceStub: Stub;

  beforeEach(() => {
  });

  afterEach(() => {
    if (!novuGlobalPreferenceStub?.restored) {
      novuGlobalPreferenceStub?.restore();
    }
    if (!novuPreferenceStub?.restored) {
      novuPreferenceStub?.restore();
    }
  });

  describe("fetching preferences", () => {
    it("fetches global and workflow preferences for subscriber", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();

      await fetchPreferences(novu, subscriberId);

      assertSpyCall(novuGlobalPreferenceStub, 0, {
        self: novu.subscribers,
        args: [subscriberId],
      });
      assertSpyCall(novuPreferenceStub, 0, {
        self: novu.subscribers,
        args: [subscriberId],
      });
    });

    it("throws unauthorized error for missing subscriber id", async () => {
      await assertRejects(
        () => fetchPreferences(novu, undefined),
        GraphQLError,
        "Unauthorized",
      );
    });

    it("throws unauthorized error for empty subscriber id", async () => {
      await assertRejects(
        () => fetchPreferences(novu, ""),
        GraphQLError,
        "Unauthorized",
      );
    });

    it("transforms preferences and groups workflow templates", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: preferencesAllEnabled,
        },
        {
          id: "SPACE_NEW_POST",
          category: "SPACES",
          preferences: { push: false, email: undefined },
        },
        {
          id: "SPACE_MEMBERSHIP_REQUEST",
          category: "SPACES",
          preferences: preferencesAllEnabled,
        },
      ];
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();

      const result = await fetchPreferences(novu, subscriberId);

      assertEquals(result, expectedPreferences);
    });

    it("only returns global preferences if no workflows were fetched", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: preferencesAllEnabled,
        },
      ];
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences([]);

      const result = await fetchPreferences(novu, subscriberId);

      assertEquals(result, expectedPreferences);
    });

    it("throws error if fetching global preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences(new Error("Test"));
      novuPreferenceStub = stubNovuWorkflowPreferences();

      await assertRejects(
        () => fetchPreferences(novu, subscriberId),
        Error,
        "Test",
      );
    });

    it("throws error if fetching workflow preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences(new Error("Test"));

      await assertRejects(
        () => fetchPreferences(novu, subscriberId),
        Error,
        "Test",
      );
    });

    it("throws error if global preferences are invalid", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences([]);
      novuPreferenceStub = stubNovuWorkflowPreferences();

      await assertRejects(
        () => fetchPreferences(novu, subscriberId),
        Error,
        "Cannot read properties of undefined",
      );
    });
  });
  // TODO(SF) add tests for update
});
