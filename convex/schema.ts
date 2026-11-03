import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const eventColor = v.union(v.literal('blue'), v.literal('violet'), v.literal('mint'), v.literal('amber'), v.literal('rose'))
export const logLocation = v.object({ latitude: v.number(), longitude: v.number(), accuracy: v.number(), capturedAt: v.number() })
export const pollQuestion = v.object({
  prompt: v.string(), kind: v.union(v.literal('choice'), v.literal('text')),
  options: v.array(v.string()), correctIndex: v.optional(v.number()),
  allowMultiple: v.optional(v.boolean()), correctIndices: v.optional(v.array(v.number())),
})
export const pollStatus = v.union(v.literal('draft'), v.literal('open'), v.literal('closed'))
export const pollPhase = v.union(v.literal('lobby'), v.literal('question'), v.literal('locked'), v.literal('results'), v.literal('finished'))
export const pollFormat = v.union(v.literal('bar'), v.literal('pie'), v.literal('donut'), v.literal('table'), v.literal('cloud'), v.literal('answers'))
export default defineSchema({
  ...authTables,
  polls: defineTable({
    ownerId: v.id('users'), title: v.string(), description: v.string(), code: v.string(),
    questions: v.array(pollQuestion), status: pollStatus, resultsVisible: v.boolean(), participantCount: v.number(),
    hosted: v.optional(v.boolean()), phase: v.optional(pollPhase), activeQuestion: v.optional(v.number()), revealed: v.optional(v.array(v.number())),
    displayFormat: v.optional(pollFormat),
  }).index('by_ownerId', ['ownerId']).index('by_code', ['code']),
  pollParticipants: defineTable({ pollId: v.id('polls'), token: v.string() })
    .index('by_pollId_and_token', ['pollId', 'token']),
  pollResponses: defineTable({
    pollId: v.id('polls'), participantId: v.id('pollParticipants'), question: v.number(),
    choice: v.optional(v.number()), choices: v.optional(v.array(v.number())), text: v.optional(v.string()), hidden: v.boolean(),
  }).index('by_pollId_and_question', ['pollId', 'question'])
    .index('by_participantId_and_question', ['participantId', 'question']),
  basketballPracticeRuns: defineTable({ ownerId: v.id('users'), runId: v.string() })
    .index('by_ownerId_and_runId', ['ownerId', 'runId']),
  basketballRuns: defineTable({
    ownerId: v.id('users'), runId: v.string(), score: v.number(), made: v.number(),
    shots: v.number(), bestStreak: v.number(), playedSeconds: v.number(),
  }).index('by_ownerId', ['ownerId'])
    .index('by_ownerId_and_score', ['ownerId', 'score'])
    .index('by_ownerId_and_runId', ['ownerId', 'runId']),
  reviews: defineTable({
    displayName: v.string(), rating: v.number(), comment: v.string(),
    hidden: v.boolean(), requestId: v.string(),
  }).index('by_hidden', ['hidden']).index('by_requestId', ['requestId']),
  users: defineTable({
    ...authTables.users.validator.fields,
    username: v.optional(v.string()),
    usernameKey: v.optional(v.string()),
    role: v.optional(v.union(v.literal('admin'), v.literal('member'))),
  }).index('email', ['email']).index('phone', ['phone'])
    .index('by_usernameKey', ['usernameKey']).index('by_role', ['role']),
  eventTypes: defineTable({
    ownerId: v.id('users'), name: v.string(), description: v.string(), color: eventColor,
    archived: v.boolean(), totalCount: v.number(), lastLoggedAt: v.optional(v.number()),
    trackLocation: v.optional(v.boolean()),
  }).index('by_ownerId', ['ownerId']),
  logs: defineTable({
    ownerId: v.id('users'), eventTypeId: v.id('eventTypes'), occurredAt: v.number(),
    comment: v.string(), requestId: v.string(), location: v.optional(logLocation),
  }).index('by_ownerId_and_occurredAt', ['ownerId', 'occurredAt'])
    .index('by_ownerId_and_eventTypeId_and_occurredAt', ['ownerId', 'eventTypeId', 'occurredAt'])
    .index('by_ownerId_and_requestId', ['ownerId', 'requestId']),
})
