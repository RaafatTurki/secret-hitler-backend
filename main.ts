import { Server, Socket } from "socket.io"
import { Message, MsgRoomJoinPayload, Room, MsgRoomJoinedPayload, Player, MsgErrors, MsgEvents, Msg, CHANNELS, MsgRoomLeftPayload, MsgRoomStartedPayload, MsgVotePayload, MsgVoteResultPayload, MsgMembershipShowPayload, MsgMembershipShownPayload, Membership } from "./types"
import { randomUUID, UUID } from "crypto"

const room: Room = {
  players: [],
  isRoomStarted: false
}

function sendToAll<T>(message: Message<T>) {
  room.players.forEach((player) => {
    if (MsgErrors.includes(message.msg as any)) {
      player.socket.emit(CHANNELS.ERR, message)
      console.log("res:", CHANNELS.ERR, message)
    } else if (MsgEvents.includes(message.msg as any)) {
      player.socket.emit(CHANNELS.EVENT, message)
      console.log("res:", CHANNELS.EVENT, message)
    }
  })
}

function sendToPlayer<T>(id: UUID, message: Message<T>) {
  const socket = room.players.find((player) => player.id === id)?.socket
  if (!socket) return

  if (MsgErrors.includes(message.msg as any)) {
    socket.emit(CHANNELS.ERR, message)
    console.log("res:", CHANNELS.ERR, message)
  } else if (MsgEvents.includes(message.msg as any)) {
    socket.emit(CHANNELS.EVENT, message)
    console.log("res:", CHANNELS.EVENT, message)
  }

}

function getPlayerList() {
  return room.players.map((player) => {
    return {
      name: player.name,
      isSpecator: player.isSpecator,
      isHitler: player.isHitler,
      isDead: player.isDead
    }
  }) as Player[]
}

function setRandomPlayerMemberships(fasTarget: number, libTarget: number) {
  let fasCount = 0
  let libCount = 0

  room.players.forEach((player) => {
    if (fasCount < fasTarget && libCount < libTarget) {
      Math.random() > 0.5 ? player.membership = Membership.FAS : player.membership = Membership.LIB
    } else if (fasCount < fasTarget || libCount < libTarget) {
      if (fasCount == fasTarget) {
        player.membership = Membership.LIB
      } else if (libCount == libTarget) {
        player.membership = Membership.FAS
      }
    } else {
      return
    }
  })
}

const io = new Server({
  cors: {
    origin: '*',
  }
})

io.on("connection", (socket) => {
  console.log("soc conn ...")

  socket.on(CHANNELS.EVENT, (str) => {
    const message = JSON.parse(str) as Message<Msg>

    console.log("req:", message)

    switch (message.msg) {
      case "room:join":
        handleRoomJoin(socket, message.payload as any)
        break
      case "room:leave":
        handleRoomLeave(socket)
        break
      case "room:start":
        handleRoomStart(socket)
        break
      case "room:restart":
        handleRoomRestart(socket)
        break
      case "vote":
        handleVote(socket, message.payload as any)
        break
      case "vote:reset":
        handleVoteReset(socket)
        break
      case "membership:show":
        handleMembershipShow(socket, message.payload as any)
        break
    }
  })
})


function handleRoomJoin(socket: Socket, payload: MsgRoomJoinPayload) {
  // check if player is already in room
  const player = room.players.find((player) => player.name === payload.name)
  if (player) {
    sendToPlayer(player.id, { msg: "err:player_already_in_room", payload: {} })
    return
  }
  // add player to room
  room.players.push({
    id: randomUUID(),
    name: payload.name,
    isSpecator: payload.isSpecator ?? false,
    isHitler: false,
    isDead: false,
    socket,
  })
  // send to all players
  sendToAll<MsgRoomJoinedPayload>({
    msg: "room:joined",
    payload: {
      players: getPlayerList()
    }
  })
}

function handleRoomLeave(socket: Socket) {
  const player = room.players.find(player => player.socket.id == socket.id)

  if (player) {
    room.players = room.players.filter(player => player.id != socket.id)
    // send to all players
    sendToAll<MsgRoomLeftPayload>({
      msg: "room:left",
      payload: {
        playerId: player.id
      }
    })
  }
}

function handleRoomStart(socket: Socket) {
  if (room.isRoomStarted) return // throw error
  const admin = room.players[0]

  if (admin) {

    switch (room.players.length) {
      case 5:
        setRandomPlayerMemberships(2, 3)
        break
      case 6:
        setRandomPlayerMemberships(2, 4)
        break
      case 7:
        setRandomPlayerMemberships(3, 4)
        break
      case 8:
        setRandomPlayerMemberships(3, 5)
        break
      case 9:
        setRandomPlayerMemberships(4, 5)
        break
      case 10:
        setRandomPlayerMemberships(4, 6)
        break
      default:
        // TODO: return an error
        return
    }


    room.isRoomStarted = true
    sendToAll<MsgRoomStartedPayload>({
      msg: "room:started",
      payload: {
        room: room
      }
    })
  }
}

function handleRoomRestart(socket: Socket) {
  const admin = room.players[0]

  if (socket.id == admin.socket.id) {
    room.isRoomStarted = false
    sendToAll({
      msg: "room:restarted",
      payload: {
        room: room
      }
    })
  }
}

function handleVote(socket: Socket, payload: MsgVotePayload) {
  const player = room.players.find(player => player.socket.id == socket.id)

  if (player && player.vote == undefined) {
    player.vote = payload.vote
    // send to voter
    sendToPlayer(player.id, {
      msg: "voted",
      payload: {
        vote: payload.vote
      }
    })
    // send to all players if everyone voted
    if (room.players.every((player) => player.vote != undefined)) {
      sendToAll<MsgVoteResultPayload>({
        msg: "vote:result",
        payload: {
          players: getPlayerList()
        }
      })
    }
  }
}

function handleVoteReset(socket: Socket) {
  const admin = room.players[0]

  if (socket.id == admin.socket.id) {
    room.players.forEach((player) => {
      player.vote = undefined
    })
    sendToAll({ msg: "vote:reseted", payload: {} })
  }
}

function handleMembershipShow(socket: Socket, payload: MsgMembershipShowPayload) {
  const player = room.players.find(player => player.socket.id == socket.id)

  if (player) {
    sendToPlayer<MsgMembershipShownPayload>(payload.playerId, {
      msg: "membership:shown",
      payload: {
        playerId: player.id
      }
    })
  }
}


console.log("listening on port 3030")
io.listen(3030)
