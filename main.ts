import { Server, Socket } from "socket.io"
import { Message, CHANNEL, MsgEvent, MsgPayloads } from "./types"
import { Room } from "./room"

const PORT = 3030

const room = new Room()

const io = new Server({
  cors: {
    origin: '*',
  }
})

io.on("connection", (socket) => {
  console.log("soc conn ...")
  socket.on('disconnect', reason => {
    console.log("soc disconnect ...")

    room.delPlayer(socket.id)

    room.sendToAll<MsgPayloads["room:left"]>({
      msg: "room:left",
      payload: {
        room: room.getRoomData()
      }
    })
  })

  socket.on(CHANNEL, (message: Message<MsgEvent>) => {
    console.log("in:", message)

    if (room.players.length == 0) {
      room.isStarted = false
      room.sockets.clear()
    }

    // dirty workaround for clients that send data as string
    try {
      message = JSON.parse(message as any)
    } catch(e) {}

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
      case "room:clear":
        handleRoomClear(socket)
        break
      case "vote":
        handleVote(socket, message.payload as any)
        break
      case "vote:clear":
        handleVoteClear(socket)
        break
      case "membership:show":
        handleMembershipShow(socket, message.payload as any)
        break
      default:
        room.send(socket.id, { msg: "err:invalid_msg", payload: {} })
        break
    }
    console.log(room.toString())
  })
})

function handleRoomJoin(socket: Socket, payload: MsgPayloads["room:join"]) {
  if (room.isStarted) {
    room.send(socket.id, { msg: "err:room_already_started", payload: {} })
    return
  }
  if (room.getPlayerById(socket.id)) {
    room.send(socket.id, { msg: "err:player_already_in_room", payload: {} })
    return
  }

  // real player
  if (payload.name) {
    if (room.checkPlayerExists(payload.name)) {
      room.send(socket.id, { msg: "err:player_with_this_name_already_in_room", payload: {} })
      return
    }

    room.addPlayer(payload.name, socket)

    room.sendToAll<MsgPayloads["room:joined"]>({
      msg: "room:joined",
      payload: {
        room: room.getRoomData()
      }
    })

    // spectator
  } else {
    room.addSpectator(socket)
  }
}

function handleRoomLeave(socket: Socket) {
  if (room.isStarted) room.send(socket.id, { msg: "err:room_already_started", payload: {} })
  room.delPlayer(socket.id)

  room.sendToAll<MsgPayloads["room:left"]>({
    msg: "room:left",
    payload: {
      room: room.getRoomData()
    }
  })
}

function handleRoomStart(socket: Socket) {
  if (room.isStarted) {
    room.send(socket.id, { msg: "err:room_already_started", payload: {} })
    return
  }
  if (!room.isPlayerAdmin(socket.id)) {
    room.send(socket.id, { msg: "err:not_admin", payload: {} })
    return
  }

  switch (room.players.length) {
    case 2:
      room.setRandomPlayerMemberships(1, 1)
      break
    case 3:
      room.setRandomPlayerMemberships(1, 2)
      break
    case 5:
      room.setRandomPlayerMemberships(2, 3)
      break
    case 6:
      room.setRandomPlayerMemberships(2, 4)
      break
    case 7:
      room.setRandomPlayerMemberships(3, 4)
      break
    case 8:
      room.setRandomPlayerMemberships(3, 5)
      break
    case 9:
      room.setRandomPlayerMemberships(4, 5)
      break
    case 10:
      room.setRandomPlayerMemberships(4, 6)
      break
    default:
      room.send(socket.id, { msg: "err:invalid_players_count", payload: {} })
      return
  }

  room.isStarted = true

  room.sendToAll<MsgPayloads["room:started"]>({
    msg: "room:started",
    payload: {
      room: room.getRoomData(),
    }
  })
}

function handleRoomClear(socket: Socket) {
  if (!room.isPlayerAdmin(socket.id)) {
    room.send(socket.id, { msg: "err:not_admin", payload: {} })
    return
  }

  room.reset()

  room.sendToAll({
    msg: "room:cleared",
    payload: {}
  })
}

function handleVote(socket: Socket, payload: MsgPayloads["voted"]) {
  if (!room.isStarted) {
    room.send(socket.id, { msg: "err:room_not_started", payload: {} })
    return
  }

  const isVoted = room.setVote(socket.id, payload.vote)

  if (isVoted) {
    room.send(socket.id, {
      msg: "voted",
      payload: {
        vote: payload.vote
      }
    })

    if (room.players.every((player) => player.vote != undefined)) {
      room.sendToAll<MsgPayloads["vote:result"]>({
        msg: "vote:result",
        payload: {
          room: room.getRoomData()
        }
      })
    }
  }
}

function handleVoteClear(socket: Socket) {
  if (!room.isPlayerAdmin(socket.id)) {
    room.send(socket.id, { msg: "err:not_admin", payload: {} })
    return
  }

  room.resetVotes()

  room.sendToAll({ msg: "vote:cleared", payload: {} })
}

function handleMembershipShow(socket: Socket, payload: MsgPayloads["membership:show"]) {
  room.send<MsgPayloads["membership:shown"]>(payload.playerId, {
    msg: "membership:shown",
    payload: {
      playerId: socket.id
    }
  })
}

console.log(`listening on port ${PORT}`)
io.listen(3030)
