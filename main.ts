import { Server, Socket } from "socket.io"
import { Message, CHANNEL, MsgEvent, MsgPayloads, Errs, Err } from "./types"
import { Game } from "./game"

const PORT = 3030

const game = new Game()

const io = new Server({
  cors: {
    origin: '*',
  }
})

io.on("connection", (socket) => {
  console.log(`soc conn ${socket.id}`)

  // handle disconnect
  socket.on('disconnect', _reason => {
    console.log(`soc disconn ${socket.id}`)

    game.delPlayer(socket.id)

    game.sendToAll<"room:left">({
      msg: "room:left",
      payload: {
        room: game.data()
      }
    })
  })

  // handle message
  socket.on(CHANNEL, (message: Message<MsgEvent>) => {
    console.log("in:", message)

    // NOTE: attempt to json parse msg in case it got recieved as a string
    try {
      message = JSON.parse(message as any)
    } catch(e) {}

    try {
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
        case "room:kick":
          handleRoomKick(socket, message.payload as any)
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
          throw Err("err:invalid_json")
      }
    } catch(e) {
      // catching game request errors and sending them to the current socket
      if (Object.keys(Errs).includes(e as any)) {
        game.send(socket.id, { msg: e })
      } else {
        console.log(e)
        // throw e
      }
    } finally {
      console.log(game.toString())
    }
  })

  // auto clear room if no players left
  if (game.players.length == 0) game.clear()
})

function handleRoomJoin(socket: Socket, payload: MsgPayloads["room:join"]) {
  if (game.isStarted) throw Err("err:room_already_started")
  if (game.getPlayerById(socket.id)) throw Err("err:player_already_in_room")

  // real player
  if (payload.name) {
    if (game.checkPlayerExists(payload.name)) throw Err("err:player_with_this_name_already_in_room")
    game.addPlayer(payload.name, socket)
    game.sendToAll<"room:joined">({
      msg: "room:joined",
      payload: {
        room: game.data()
      }
    })

    // spectator
  } else {
    game.addSpectator(socket)
  }
}

function handleRoomLeave(socket: Socket) {
  if (game.isStarted) throw Err("err:room_already_started")
  game.delPlayer(socket.id)
  game.sendToAll<"room:left">({
    msg: "room:left",
    payload: {
      room: game.data()
    }
  })
}

function handleRoomStart(socket: Socket) {
  if (game.isStarted) throw Err("err:room_already_started")
  if (!game.isPlayerAdmin(socket.id)) throw Err("err:not_admin")

  switch (game.players.length) {
    case 1:
      game.setRandomPlayerMemberships(1, 0)
      break
    case 2:
      game.setRandomPlayerMemberships(1, 1)
      break
    case 3:
      game.setRandomPlayerMemberships(1, 2)
      break

    case 5:
      game.setRandomPlayerMemberships(2, 3)
      break
    case 6:
      game.setRandomPlayerMemberships(2, 4)
      break
    case 7:
      game.setRandomPlayerMemberships(3, 4)
      break
    case 8:
      game.setRandomPlayerMemberships(3, 5)
      break
    case 9:
      game.setRandomPlayerMemberships(4, 5)
      break
    case 10:
      game.setRandomPlayerMemberships(4, 6)
      break
    default:
      throw Err("err:invalid_players_count")
  }

  game.isStarted = true
  game.sendToAll<"room:started">({
    msg: "room:started",
    payload: {
      room: game.data(),
    }
  })
}

function handleRoomKick(socket: Socket, payload: MsgPayloads["room:kick"]) {
  if (game.isStarted) throw Err("err:room_already_started")
  if (!game.isPlayerAdmin(socket.id)) throw Err("err:not_admin")

  game.delPlayer(payload.playerId)
  game.sendToAll<"room:kicked">({
    msg: "room:kicked",
    payload: {
      room: game.data(),
    }
  })
}

function handleRoomClear(socket: Socket) {
  if (!game.isPlayerAdmin(socket.id)) throw Err("err:not_admin")

  game.sendToAll({
    msg: "room:cleared"
  })
  game.clear()
}

function handleVote(socket: Socket, payload: MsgPayloads["voted"]) {
  if (!game.isStarted) throw Err("err:room_not_started")

  if (game.setVote(socket.id, payload.vote)) {
    game.send(socket.id, {
      msg: "voted",
      payload: {
        vote: payload.vote
      }
    })

    if (game.players.every((player) => player.vote != undefined)) {
      game.sendToAll<"vote:result">({
        msg: "vote:result",
        payload: {
          room: game.data()
        }
      })
    }
  }
}

function handleVoteClear(socket: Socket) {
  if (!game.isPlayerAdmin(socket.id)) throw Err("err:not_admin")

  game.resetVotes()
  game.sendToAll({ msg: "vote:cleared" })
}

function handleMembershipShow(socket: Socket, payload: MsgPayloads["membership:show"]) {
  game.send<"membership:shown">(payload.playerId, {
    msg: "membership:shown",
    payload: {
      playerId: socket.id
    }
  })
}

console.log(`listening on port ${PORT}`)
io.listen(3030)
