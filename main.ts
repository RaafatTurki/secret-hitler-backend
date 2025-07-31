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

  socket.on(CHANNEL, (message: Message<MsgEvent>) => {
    console.log("in:", message)

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
      case "room:reset":
        handleRoomReset(socket)
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
        room.send(socket.id, { msg: "err:invalid_msg", payload: {} })
        break
    }

    console.log(room.toString())
  })
})


function handleRoomJoin(socket: Socket, payload: MsgPayloads["room:join"]) {
  if (room.isStarted) room.send(socket.id, { msg: "err:room_already_started", payload: {} })

  // real player
  if (payload.name) {
    if (room.checkPlayerExists(payload.name)) {
      room.send(socket.id, { msg: "err:player_already_in_room", payload: {} })
      return
    }

    room.addPlayer(payload.name, socket)

    room.sendToAll<MsgPayloads["room:joined"]>({
      msg: "room:joined",
      payload: {
        players: room.listPlayers()
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
}

function handleRoomStart(socket: Socket) {
  if (room.isStarted) room.send(socket.id, { msg: "err:room_already_started", payload: {} })
  if (!room.isPlayerAdmin(socket.id)) room.send(socket.id, { msg: "err:not_admin", payload: {} })

  switch (room.players.length) {
    case 2:
      room.setRandomPlayerMemberships(1, 1)
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
      players: room.listPlayers(),
    }
  })
}

function handleRoomReset(socket: Socket) {
  if (room.isStarted) room.send(socket.id, { msg: "err:room_already_started", payload: {} })
  if (!room.isPlayerAdmin(socket.id)) room.send(socket.id, { msg: "err:not_admin", payload: {} })

  room.reset()

  room.sendToAll({
    msg: "room:reseted",
    payload: {
      room: room
    }
  })
}

function handleVote(socket: Socket, payload: MsgPayloads["vote"]) {
  if (room.isStarted) room.send(socket.id, { msg: "err:room_already_started", payload: {} })

  room.setVote(socket.id, payload.vote)

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
        players: room.listPlayers()
      }
    })
  }
}

function handleVoteReset(socket: Socket) {
  if (room.isStarted) room.send(socket.id, { msg: "err:room_already_started", payload: {} })
  if (!room.isPlayerAdmin(socket.id)) room.send(socket.id, { msg: "err:not_admin", payload: {} })

  room.resetVotes()

  room.sendToAll({ msg: "vote:reseted", payload: {} })
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
