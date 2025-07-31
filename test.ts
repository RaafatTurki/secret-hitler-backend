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

const client1 = new Client("client1")
const client2 = new Client("client2")

client1.join()
client2.join()

// client1.leave()
// client2.leave()
// client3.leave()
// client4.leave()
// client5.leave()

client2.start()
// client2.start()
// client3.start()
// client4.start()
// client5.start()
