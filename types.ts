export const CHANNEL = "event"

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
}

export type Room = {
  isStarted: boolean
  players: Player[]
}

export interface MsgPayloads {
  "room:join": { name?: string },
  "room:joined": { room: Room },

  "room:leave": {},
  "room:left": { room: Room },

  "room:start": {},
  "room:started": { room: Room },

  "room:kick": { playerId: string },
  "room:kicked": { room: Room },

  "room:clear": {},
  "room:cleared": {},

  "vote": { vote: boolean },
  "voted": { vote: boolean },
  "vote:result": { room: Room },

  "vote:clear": {},
  "vote:cleared": {},

  "membership:show": { playerId: string },
  "membership:shown": { playerId: string },
}

export type MsgEvent = keyof MsgPayloads

type HasPayload = {
  [K in MsgEvent]: MsgPayloads[K] extends Record<string, never> ? never : K
}[MsgEvent];

export type Message<P extends MsgEvent> = P extends HasPayload ? { msg: P, payload: MsgPayloads[P] } : { msg: P, payload?: undefined }

export const Errs = {
  "err:invalid_json": "err:invalid_json",
  "err:player_already_in_room": "err:player_already_in_room",
  "err:player_with_this_name_already_in_room": "err:player_with_this_name_already_in_room",
  "err:invalid_msg": "err:invalid_msg",
  "err:room_already_started": "err:room_already_started",
  "err:room_not_started": "err:room_not_started",
  "err:not_admin": "err:not_admin",
  "err:invalid_socket_id": "err:invalid_socket_id",
  "err:invalid_players_count": "err:invalid_players_count",
} as const
export type Errs = typeof Errs

export function Err(err: keyof typeof Errs) {
  return {
    msg: err,
  }
}
