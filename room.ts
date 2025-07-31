import { Socket } from "socket.io"
import { CHANNEL, Membership, Message, Player } from "./types"

export class Room {
  sockets: Map<string, Socket> = new Map()
  isStarted = false
  players: Player[] = []

  addPlayer(name: string, socket: Socket) {
    this.sockets.set(socket.id, socket)
    const player = {
      id: socket.id,
      name,
      isSpecator: false,
      isHitler: false,
      isDead: false,
      membership: null,
      vote: null,
    }
    this.players.push(player)
    return player
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
      return `${p.name} ${p.membership} ${p.isHitler ? "H" : ""} ${p.isDead ? "D" : ""} ${p.isSpecator ? "S" : ""} ${p.vote != null ? `vote:${p.vote}` : ""}`
    }).join(", ")
    str += ']'

    return str
  }

  setVote(playerId: string, vote: boolean) {
    const p = this.getPlayerById(playerId)
    if (p && p.vote == null) p.vote = vote
  }

  resetVotes() {
    this.players.map(p => {
      p.vote = null
    })
  }

  reset() {
    this.isStarted = false
    this.players.map(p => {
      p.vote = null
      p.isHitler = false
      p.membership = null
    })
  }

  setRandomPlayerMemberships(fasTarget: number, libTarget: number) {
    let fasCount = 0
    let libCount = 0

    // shuffle membership
    this.players.forEach(p => {
      if (fasCount < fasTarget && libCount < libTarget) {
        if (Math.random() > 0.5) {
          p.membership = Membership.FAS
          fasCount++
        } else {
          p.membership = Membership.LIB
          libCount++
        }
      } else if (fasCount < fasTarget || libCount < libTarget) {
        if (fasCount == fasTarget) {
          p.membership = Membership.LIB
          libCount++
        } else if (libCount == libTarget) {
          p.membership = Membership.FAS
          fasCount++
        }
      }
    })

    // pick hitler
    const fasPlayers = this.players.filter(player => player.membership == Membership.FAS)
    const hitler = fasPlayers[Math.floor(Math.random() * fasPlayers.length)]
    hitler.isHitler = true
  }

  send<T>(id: string, message: Message<T>) {
    const socket = this.sockets.get(id)
    if (!socket) return
    socket.emit(CHANNEL, message)
    console.log("out:", message)
  }

  sendToAll<T>(message: Message<T>) {
    this.sockets.forEach((socket) => {
      socket.emit(CHANNEL, message)
    })
    console.log("out_all:", message)
  }
}

