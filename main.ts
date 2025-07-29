import { Server, Socket } from "socket.io"
import { Message, MsgRoomJoinPayload, Room, MsgRoomJoinedPayload, Player, MsgErrors, MsgEvents, Msg, CHANNELS, MsgRoomLeftPayload, MsgRoomStartedPayload, MsgVotePayload, MsgVoteResultPayload, MsgMembershipShowPayload, MsgMembershipShownPayload, Membership } from "./types"
import { randomUUID, UUID } from "crypto"

const room: Room = {
  players: [],
  isRoomStarted: false
}

function sendToAll<T>(message: Message<T>) {
  room.players.forEach((player) => {
    console.log("sendToAll", player.socket.id, message)
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

function sendToSocket<T>(socketId: string, message: Message<T>) {
  const socket = room.players.find(player => player.socket.id == socketId)?.socket
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
  return room.players.map(player => {
    return {
      id: player.id,
      name: player.name,
      vote: player.vote,
      membership: player.membership,
      isHitler: player.isHitler,
      isDead: player.isDead,
      isSpecator: player.isSpecator,
    }
  }) as Player[]
}

function getPlayerBySocketId(socketId: string) {
  return room.players.find((player) => player.socket.id === socketId)
}

function setRandomPlayerMemberships(fasTarget: number, libTarget: number) {
  let fasCount = 0
  let libCount = 0

  room.players.forEach((player) => {
    if (fasCount < fasTarget && libCount < libTarget) {
      if (Math.random() > 0.5) {
        player.membership = Membership.FAS
        fasCount++
      } else {
        player.membership = Membership.LIB
        libCount++
      }
    } else if (fasCount < fasTarget || libCount < libTarget) {
      if (fasCount == fasTarget) {
        player.membership = Membership.LIB
        libCount++
      } else if (libCount == libTarget) {
        player.membership = Membership.FAS
        fasCount++
      }
    } else {
      console.log("no change")
      return
    }
  })

  console.log("players", room.players.map(player => player.name))
  const fasPlayers = room.players.filter(player => player.membership == Membership.FAS)
  console.log("fas players", fasPlayers.map(player => player.name))
  const hitler = fasPlayers[Math.floor(Math.random() * fasPlayers.length)]
  console.log("hitler", hitler.name)
  hitler.isHitler = true
}

const io = new Server({
  cors: {
    origin: '*',
  }
})

io.on("connection", (socket) => {
  console.log("soc conn ...")

  socket.on(CHANNELS.EVENT, (str) => {
    console.log("req:", str)

    let message: Message<Msg> = str
    // try {
    //   message = JSON.parse(str) as Message<Msg>
    // } catch(e) {
    //   console.error(e)
    //   // TODO: implement a sendToSeocket function
    //   const player = getPlayerBySocketId(socket.id)
    //   console.log("player:", player, socket.id)
    //   if (player) {
    //     sendToSocket(socket.id, { msg: "err:invalid_json", payload: {} })
    //   }
    //   return
    // }

    console.log("json:", message)

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
      default:
        sendToSocket(socket.id, { msg: "err:invalid_msg", payload: {} })
        break
    }
  })
})


function handleRoomJoin(socket: Socket, payload: MsgRoomJoinPayload) {
  if (room.isRoomStarted) sendToSocket(socket.id, { msg: "err:room_already_started", payload: {} })

  const player = room.players.find(player => player.name == payload.name)
  if (player) {
    sendToPlayer(player.id, { msg: "err:player_already_in_room", payload: {} })
    return
  }

  room.players.push({
    id: randomUUID(),
    name: payload.name,
    isSpecator: payload.isSpecator ?? false,
    isHitler: false,
    isDead: false,
    socket,
  })

  sendToAll<MsgRoomJoinedPayload>({
    msg: "room:joined",
    payload: {
      players: getPlayerList()
    }
  })
}

function handleRoomLeave(socket: Socket) {
  if (room.isRoomStarted) sendToSocket(socket.id, { msg: "err:room_already_started", payload: {} })
  const player = getPlayerBySocketId(socket.id)

  if (player) {
    room.players = room.players.filter(p => player.id != p.id)

    sendToAll<MsgRoomLeftPayload>({
      msg: "room:left",
      payload: {
        playerId: player.id
      }
    })
  }
}

function handleRoomStart(socket: Socket) {
  if (room.isRoomStarted) sendToSocket(socket.id, { msg: "err:room_already_started", payload: {} })

  const player = getPlayerBySocketId(socket.id)
  if (!player) {
    sendToSocket(socket.id, { msg: "err:invalid_socket_id", payload: {} })
    return
  }
  const admin = room.players[0]
  if (player?.id != admin?.id) sendToSocket(socket.id, { msg: "err:not_admin", payload: {} })

  switch (room.players.length) {
    case 2:
      setRandomPlayerMemberships(1, 1)
      break
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
      sendToSocket(socket.id, { msg: "err:invalid_players_count", payload: {} })
      return
  }

  room.isRoomStarted = true

  sendToAll<MsgRoomStartedPayload>({
    msg: "room:started",
    payload: {
      players: getPlayerList(),
    }
  })
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
