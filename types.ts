export const CHANNEL = "event"

export const MsgEvents = [
  "room:join",
  "room:joined",

  "room:leave",
  "room:left",

  "room:start",
  "room:started",

  "room:clear",
  "room:cleared",

  "vote",
  "voted",
  "vote:result",

  "vote:clear",
  "vote:cleared",

  "membership:show",
  "membership:shown",


  "err:invalid_json",
  "err:player_already_in_room",
  "err:player_with_this_name_already_in_room",
  "err:invalid_msg",
  "err:room_already_started",
  "err:not_admin",
  "err:invalid_socket_id",
  "err:invalid_players_count",
] as const
export type MsgEvent = typeof MsgEvents[number]

export interface Message<T> {
  msg: MsgEvent
  payload: T
}

export enum Membership {
  LIB = "LIB",
  FAS = "FAS",
}

export type Specator = {
  id: string
  name: string
}

export type Player = {
  id: string
  name: string
  vote: boolean | null
  membership: Membership | null
  isHitler: boolean
  isDead: boolean
}

export type MsgPayloads = {
  "room:join": {
    name?: string
  },
  "room:joined": {
    players: Player[]
  },
  "room:left": {
    players: Player[]
  },
  "room:started": {
    players: Player[]
  },
  "vote": {
    vote: boolean
  },
  "vote:result": {
    players: Player[]
  },
  "membership:show": {
    playerId: string
  },
  "membership:shown": {
    playerId: string
  }
}
