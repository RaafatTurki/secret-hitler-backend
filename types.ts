import { UUID } from "crypto"
import { Socket } from "socket.io"

export const CHANNELS = {
  EVENT: "event",
  ERR: "err",
} as const

export const MsgEvents = [
  "room:join",
  "room:joined",
  "room:leave",
  "room:left",
  "room:start",
  "room:started",
  "room:restart",
  "room:restarted",
  "vote",
  "voted",
  "vote:result",
  "vote:reset",
  "vote:reseted",
  "membership:show",
  "membership:shown",
] as const
export type MsgEvent = typeof MsgEvents[number]

export const MsgErrors = [
  "err:player_already_in_room",
  "err:invalid_json",
] as const
export type MsgError = typeof MsgErrors[number]

export const Msgs = [
  ...MsgEvents,
  ...MsgErrors,
] as const
export type Msg = typeof Msgs[number]


export enum Membership {
  LIB = "LIB",
  FAS = "FAS",
}

export interface Player {
  id: UUID
  name: string
  vote?: boolean
  membership?: Membership
  isHitler: boolean
  isDead: boolean
  isSpecator: boolean
  socket: Socket
}

export interface Room {
  players: Player[]
  isRoomStarted: boolean
}


export interface Message<T> {
  msg: Msg
  payload: T
}

export interface MsgRoomJoinPayload {
  name: string
  isSpecator?: boolean
}

export interface MsgRoomJoinedPayload {
  players: Player[]
}


export interface MsgRoomLeftPayload {
  playerId: UUID
}


export interface MsgRoomStartedPayload {
  room: Room
}


export interface MsgVotePayload {
  vote: boolean
}


export interface MsgVoteResultPayload {
  players: Player[]
}


export interface MsgMembershipShowPayload {
  playerId: UUID
}


export interface MsgMembershipShownPayload {
  playerId: UUID
}
