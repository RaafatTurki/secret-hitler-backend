import { Socket } from "socket.io"
import { CHANNEL, Membership, Message, MsgEvent, Player, Room, Specator } from "./types"

export class Game {
  sockets: Map<string, Socket> = new Map()
  isStarted = false
  players: Player[] = []
  spectators: Specator[] = []

  data() {
    return {
      isStarted: this.isStarted,
      players: this.listPlayers(),
    } as Room
  }

  addPlayer(name: string, socket: Socket) {
    this.sockets.set(socket.id, socket)
    const player: Player = {
      id: socket.id,
      name,
      isHitler: false,
      membership: null,
      vote: null,
    }
    this.players.push(player)
    return player
  }

  addSpectator(socket: Socket) {
    this.sockets.set(socket.id, socket)
    const spectator = {
      id: socket.id,
      name: `spectator#${this.spectators.length}`,
    }
    this.spectators.push(spectator)
  }

  checkPlayerExists(name: string) {
    return this.players.find(p => p.name == name)
  }

  delPlayer(id: string) {
    this.sockets.delete(id)
    this.players = this.players.filter(p => id != p.id)
  }

  getPlayerById(id: string) {
    return this.players.find(p => p.id == id)
  }

  isPlayerAdmin(id: string) {
    console.log(this.players)
    console.log(id)
    if (this.players.length == 0) return false
    return this.players[0].id == id
  }

  listPlayers() {
    return this.players
  }

  toString() {
    let str = `Room: `
    str += this.isStarted ? `started ` : `pending `
    str += `p${this.players.length} `
    str += '['
    str += this.players.map(p => {
      return `${p.name} ${p.membership} ${p.isHitler ? "H" : ""} ${p.vote != null ? `vote:${p.vote}` : ""}`
    }).join(", ")
    str += ']'

    return str
  }

  setVote(playerId: string, vote: boolean) {
    const p = this.getPlayerById(playerId)
    if (p && p.vote == null) {
      p.vote = vote
      return true
    } else {
      return false
    }
  }

  resetVotes() {
    this.players.forEach(p => {
      p.vote = null
    })
  }

  clear() {
    this.isStarted = false
    this.players = []
    this.sockets.clear()
  }

  setRandomPlayerMemberships(fasTarget: number) {
    let fasIndecies: number[] = []

    while (fasIndecies.length < fasTarget) {
      const i = Math.floor(Math.random() * this.players.length)
      if (fasIndecies.includes(i)) continue
      fasIndecies.push(i)
    }

    this.players.forEach((p, i) => {
      if (fasIndecies.includes(i)) {
        p.membership = Membership.FAS
      } else {
        p.membership = Membership.LIB
      }
    })

    // pick hitler
    const fasPlayers = this.players.filter(player => player.membership == Membership.FAS)
    const hitler = fasPlayers[Math.floor(Math.random() * fasPlayers.length)]
    hitler.isHitler = true
  }



  send<T extends MsgEvent>(id: string, message: Message<T>) {
    const socket = this.sockets.get(id)
    if (!socket) return
    socket.emit(CHANNEL, message)
    console.log("out:", message)
  }

  sendToAll<T extends MsgEvent>(message: Message<T>) {
    this.sockets.forEach((socket) => {
      socket.emit(CHANNEL, message)
    })
    console.log("out_all:", message)
  }
}

