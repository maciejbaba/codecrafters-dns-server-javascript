const dgram = require('dgram');

const udpSocket = dgram.createSocket('udp4');
udpSocket.bind(2053, '127.0.0.1');

function createDNSHeader() {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(1234, 0); // packet id
  header.writeUInt16BE(0x8000, 2); // flags
  header.writeUInt16BE(1, 4); // question count
  header.writeUInt16BE(1, 6); // answer count
  header.writeUInt16BE(0, 8); // authority count
  header.writeUInt16BE(0, 10); // additional count

  return header;
}

function encodeIP(ip) {
  const ipParts = ip.split('.');
  return Buffer.from(ipParts.map((part) => parseInt(part)));
}

function createAnswerSection() {
  const domainBuffer = encodeDomainName('codecrafters.io');
  const rest = Buffer.alloc(14);
  rest.writeUInt16BE(1, 0); // type: 1 (A record)
  rest.writeUInt16BE(1, 2); // class: 1 (IN)
  rest.writeUInt16BE(300, 4); // ttl
  rest.writeUInt16BE(4, 8); // rdlength
  rest.writeUInt32BE(encodeIP('8.8.8.8'), 10); // rdata

  return Buffer.concat([domainBuffer, rest]);
}

function encodeDomainName(domainName) {
  const parts = domainName.split('.');
  return Buffer.concat(
    parts.map((part) => {
      const label = Buffer.from(part);
      return Buffer.concat([Buffer.from([part.length]), label]);
    })
  ).concat(Buffer.from([0]));
}

function createQuestionSection() {
  const encodedDomain = encodeDomainName('codecrafters.io');
  const typeAndClass = Buffer.alloc(4);
  typeAndClass.writeUInt16BE(1, 0); // type: 1 (A record)
  typeAndClass.writeUInt16BE(1, 2); // class: 1 (IN)

  return Buffer.concat([encodedDomain, typeAndClass]);
}

udpSocket.on('message', (buf, rinfo) => {
  try {
    const responseHeader = createDNSHeader();
    const question = createQuestionSection();
    const answer = createAnswerSection();

    const response = Buffer.concat([responseHeader, question, answer]);
    udpSocket.send(response, rinfo.port, rinfo.address);
  } catch (e) {
    console.log(`Error receiving data: ${e}`);
  }
});

udpSocket.on('error', (err) => {
  console.log(`Error: ${err}`);
});

udpSocket.on('listening', () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});
