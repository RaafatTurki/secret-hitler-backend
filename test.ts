import { io, Socket } from "socket.io-client"

class Client {
  name: string
  soc: Socket

  constructor(name: string) {
    this.name = name
    this.connect()
  }

  connect() {
    this.soc = io("ws://localhost:3030", {
      reconnectionDelayMax: 10000,
    })

    this.soc.on("event", (data) => {
      console.log(data)
    })

    this.soc.on("connect", () => {
      console.log(`connected ${this.name}`)
    })
  }

  join() {
    this.soc.emit("event", {
      msg: "room:join",
      payload: {
        name: this.name
      }
    })
  }

  leave() {
    this.soc.emit("event", {
      msg: "room:leave",
      payload: {}
    })
  }

  start() {
    this.soc.emit("event", {
      msg: "room:start",
      payload: {}
    })
  }
}

const T = 100

async function main() {
  const client1 = new Client("client1")
  const client2 = new Client("client2")
  const client3 = new Client("client3")
  const client4 = new Client("client4")
  const client5 = new Client("client5")
  const client6 = new Client("client6")
  const client7 = new Client("client7")
  const client8 = new Client("client8")
  const client9 = new Client("client9")
  const client10 = new Client("client10")

  client1.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client2.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client3.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client4.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client5.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client6.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client7.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client8.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client9.join()
  await new Promise(resolve => setTimeout(resolve, T))
  client10.join()

  // client1.leave()
  // client2.leave()
  // client3.leave()
  // client4.leave()
  // client5.leave()

  await new Promise(resolve => setTimeout(resolve, T))
  client1.start()
  // client2.start()
  // client3.start()
  // client4.start()
  // client5.start()
}

main()
