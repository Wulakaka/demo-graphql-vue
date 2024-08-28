import { ApolloClient, ApolloLink, createHttpLink, InMemoryCache, split } from '@apollo/client/core'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'

export default function (uri: string) {
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors)
      graphQLErrors.forEach(({ message, locations, path }) =>
        console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`),
      )

    if (networkError) console.log(`[Network error]: ${networkError}`)
  })

  // HTTP connection to the API
  const httpLink = createHttpLink({
    // You should use an absolute URL here
    uri: uri,
  })

  const wsLink = new GraphQLWsLink(
    createClient({
      url: uri,
      connectionParams: () => ({
        Authorization: localStorage.getItem('Authorization'),
        AuthContextCode: localStorage.getItem('AuthCtxCode'),
        ProjectCode: localStorage.getItem('ProjectCode'),
        ProjectId: localStorage.getItem('ProjectId'),
      }),
    }),
  )

  // 使用 setContext 来设置头参数
  const authLink = setContext((_, { headers }) => {
    // 返回新的头参数对象
    return {
      headers: {
        ...headers,
        ...{
          Authorization: localStorage.getItem('Authorization'),
          AuthContextCode: localStorage.getItem('AuthCtxCode'),
          ProjectCode: localStorage.getItem('ProjectCode'),
          ProjectId: localStorage.getItem('ProjectId'),
        },
      },
    }
  })

  const link = split(
    // 根据操作类型拆分
    ({ query }) => {
      const definition = getMainDefinition(query)
      return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
    },
    wsLink,
    httpLink,
  )

  // Cache implementation
  const cache = new InMemoryCache()

  // Create the apollo client
  const apolloClient = new ApolloClient({
    link: ApolloLink.from([authLink, errorLink, link]),
    cache,
  })

  return apolloClient
}
