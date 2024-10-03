import { returnsNext, stub } from './dev_deps.ts'
import { NovuGlobalPreferences, NovuWorkflowPreferences } from './novu_types.ts'
import { GraphQLServer } from './server.ts'
import { novuMock, testGlobalPreferences, testWorkflowPreferences } from './test_data.ts'

export const processGqlRequest = (
  graphQLServer: GraphQLServer,
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, unknown> = {},
): Promise<Record<string, unknown> | undefined | null> => {
  const request = new Request('http://localhost:8005/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': '*/*',
      ...headers,
    },
    body: JSON.stringify({
      operationName: null,
      variables: variables,
      query: query,
    }),
  })
  return graphQLServer.handleRequest(request)
    // deno-lint-ignore no-explicit-any
    .then((response: any) => response.json())
    // deno-lint-ignore no-explicit-any
    .then((response: any) => response.data)
}

export const stubNovuGlobalPreferences = (
  response: NovuGlobalPreferences[] | Error = testGlobalPreferences,
) =>
  stub(
    novuMock.subscribers,
    'getGlobalPreference',
    // @ts-ignore: Full mock of AxiosResponse not necessary
    returnsNext([
      response instanceof Error ? Promise.reject(response) : Promise.resolve({ data: { data: response } }),
    ]),
  )

export const stubNovuWorkflowPreferences = (
  response: NovuWorkflowPreferences[] | Error = testWorkflowPreferences,
) =>
  stub(
    novuMock.subscribers,
    'getPreference',
    // @ts-ignore: Full mock of AxiosResponse not necessary
    returnsNext([
      response instanceof Error ? Promise.reject(response) : Promise.resolve({ data: { data: response } }),
    ]),
  )

export const stubNovuUpdateGlobalPreferences = (error?: Error) =>
  stub(
    novuMock.subscribers,
    'updateGlobalPreference',
    // @ts-ignore: Full mock of AxiosResponse not necessary
    returnsNext([
      error ? Promise.reject(error) : Promise.resolve(),
    ]),
  )

export const stubNovuUpdateWorkflowPreferences = (error?: Error) =>
  stub(
    novuMock.subscribers,
    'updatePreference',
    returnsNext(
      (error ? [Promise.reject(error)] : []).concat(
        // @ts-ignore: Full mock of AxiosResponse not necessary
        testWorkflowPreferences.map(() => Promise.resolve()),
      ),
    ),
  )
