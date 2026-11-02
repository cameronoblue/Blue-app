import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import { usernameParts } from './lib/access'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({
    profile(params) {
      if (params.flow !== 'signIn') throw new ConvexError('Accounts are created by an administrator.')
      if (typeof params.username !== 'string') throw new ConvexError('Enter your username.')
      // Password's account identifier supports usernames as well as email addresses.
      return { email: usernameParts(params.username).usernameKey }
    },
  })],
})
