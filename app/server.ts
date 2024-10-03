import { createSchema, createYoga, Novu, serve, YogaInitialContext } from './deps.ts'
import { logger } from './logging.ts'
import { createNovuInstance, fetchPreferences, NovuConfig, updatePreferences } from './novu.ts'
import { PreferencesResponse, UpdatePreferencesParameters } from './types.ts'

export const DEFAULT_PORT = 8005
export const HEADER_USER_ID = 'x-holi-user-id'
export const LOCAL_ENVIRONMENT = 'local'

export interface ServerConfig {
  port: number // default: 8005
  fake: boolean // For local development. If set, the API returns dummy data
  novuConfig: NovuConfig
  environment: string
}

export type ServiceContext = {
  userId: string
} & YogaInitialContext

const typeDefs = `
    enum Channel {
      push
      email
    }

    type ChannelPreferences {
        push: Boolean
        email: Boolean
    }

    type WorkflowPreferences {
        id: String!
        category: String!
        preferences: ChannelPreferences!
    }

    input UpdatePreferencesInput {
        id: String!
        channel: Channel!
        enabled: Boolean!
    }

    type Query {
        preferences: [WorkflowPreferences]!
    }

    type Mutation {
        updatePreferences(input: UpdatePreferencesInput!): [WorkflowPreferences]!
    }
  
`

const createResolvers = (novu: Novu, config: ServerConfig) => {
  return {
    Query: {
      preferences: (
        // deno-lint-ignore no-explicit-any
        _parent: any,
        // deno-lint-ignore no-explicit-any
        _parameters: any,
        context: ServiceContext,
      ): Promise<PreferencesResponse> => {
        return config.fake ? Promise.resolve([]) : fetchPreferences(novu, context.userId)
      },
    },
    Mutation: {
      updatePreferences: (
        // deno-lint-ignore no-explicit-any
        _parent: any,
        parameters: UpdatePreferencesParameters,
        context: ServiceContext,
      ): Promise<PreferencesResponse> =>
        config.fake ? Promise.resolve([]) : updatePreferences(
          novu,
          context.userId,
          parameters.input,
        ),
    },
  }
}

export const createGraphQLServer = (
  novu: Novu,
  config: ServerConfig,
): GraphQLServer => {
  const resolvers = createResolvers(novu, config)
  return createYoga({
    schema: createSchema({ resolvers, typeDefs }),
    graphiql: config.environment === LOCAL_ENVIRONMENT,
    context: (context: YogaInitialContext) => {
      const headers = new Headers(context.request.headers)
      return {
        ...context,
        userId: headers.get(HEADER_USER_ID),
      } as ServiceContext
    },
  })
}

// deno-lint-ignore no-explicit-any
export type GraphQLServer = any

export const startServer = (config: ServerConfig): Promise<void> => {
  const novuInstance = createNovuInstance(config.novuConfig)
  const graphQLServer: GraphQLServer = createGraphQLServer(
    novuInstance,
    config,
  )
  return serve(graphQLServer.handleRequest, {
    port: config.port,
    onListen({ port, hostname }) {
      logger.info(
        `Server started at http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}/graphql`,
      )
      if (config.fake) {
        logger.info(
          `Server is serving fake data due to FAKE env var set to true`,
        )
      }
    },
  })
}
