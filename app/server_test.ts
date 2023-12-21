import {
  afterEach,
  assertEquals,
  assertSpyCall,
  assertSpyCalls,
  beforeEach,
  describe,
  it,
  Stub,
} from "./dev_deps.ts";
import { GraphQLError } from "./deps.ts";
import {
  createGraphQLServer,
  GraphQLServer,
  HEADER_USER_ID,
} from "./server.ts";
import { PreferencesResponse } from "./types.ts";
import {
  novu,
  preferencesAllEnabled,
  subscriberId,
  testConfig,
} from "./test_data.ts";
import {
  processGqlRequest,
  stubNovuGlobalPreferences,
  stubNovuWorkflowPreferences,
} from "./test_helpers.ts";

const authorizedHeader = {
  [HEADER_USER_ID]: subscriberId,
};

const queryPreferences = (
  graphQLServer: GraphQLServer,
  headers: Record<string, unknown> = authorizedHeader,
): Promise<PreferencesResponse | GraphQLError> => {
  const query = `
  query Projects {
    preferences {
      id
      category
      preferences {
        push
        email
      }
    }
  }`;
  return processGqlRequest(graphQLServer, query, {}, headers).then(
    (result) => result?.preferences as PreferencesResponse,
  );
};

describe("server", () => {
  describe("preferences", () => {
    let novuGlobalPreferenceStub: Stub;
    let novuPreferenceStub: Stub;

    beforeEach(() => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
    });

    afterEach(() => {
      if (!novuGlobalPreferenceStub?.restored) {
        novuGlobalPreferenceStub?.restore();
      }
      if (!novuPreferenceStub?.restored) {
        novuPreferenceStub?.restore();
      }
    });

    it("returns aggregated response", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: preferencesAllEnabled,
        },
        {
          id: "SPACE_NEW_POST",
          category: "SPACES",
          preferences: { push: false, email: null },
        },
        {
          id: "SPACE_MEMBERSHIP_REQUEST",
          category: "SPACES",
          preferences: preferencesAllEnabled,
        },
      ];
      const graphQLServer = createGraphQLServer(novu, testConfig);

      const result = await queryPreferences(graphQLServer);

      assertEquals(result, expectedPreferences);
    });

    it("correctly retrieves user id from header", async () => {
      const graphQLServer = createGraphQLServer(novu, testConfig);

      await queryPreferences(graphQLServer);

      assertSpyCall(novuGlobalPreferenceStub, 0, {
        self: novu.subscribers,
        args: [subscriberId],
      });
      assertSpyCall(novuPreferenceStub, 0, {
        self: novu.subscribers,
        args: [subscriberId],
      });
    });

    it("does not fetch preferences if subscriber id is missing", async () => {
      const graphQLServer = createGraphQLServer(novu, testConfig);

      const result = await queryPreferences(graphQLServer, {});

      assertEquals(result, undefined);
      assertSpyCalls(novuGlobalPreferenceStub, 0);
      assertSpyCalls(novuPreferenceStub, 0);
    });
  });
  // TODO(SF) add tests for update
});
