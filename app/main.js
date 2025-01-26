const dgram = require("dgram");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

function createDNSHeader(queryBuf) {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(1234, 0); // packet id
  header.writeUInt16BE(0x8000, 2); // flags
  header.writeUInt16BE(0, 4); // question count
  header.writeUInt16BE(0, 6); // answer count
  header.writeUInt16BE(0, 8); // authority count
  header.writeUInt16BE(0, 10); // additional count

  return header;
}

udpSocket.on("message", (buf, rinfo) => {
  try {
    const response = createDNSHeader(buf);
    udpSocket.send(response, rinfo.port, rinfo.address);
  } catch (e) {
    console.log(`Error receiving data: ${e}`);
  }
});

udpSocket.on("error", (err) => {
  console.log(`Error: ${err}`);
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});
