const dgram = require('dgram');

const udpSocket = dgram.createSocket('udp4');
udpSocket.bind(2053, '127.0.0.1');

class DNS {
  constructor(domain) {
    this.domain = domain;
  }

  createDNSHeader(incomingHeader) {
    const header = Buffer.alloc(12);
    header.writeUInt16BE(incomingHeader.packetId, 0); // packet id

    let flags = 0;
    flags |= (1 << 15);
    flags |= (incomingHeader.operationCode << 11);
    flags |= (0 << 10);
    flags |= (0 << 9);
    flags |= (incomingHeader.recursionDesired << 8);
    flags |= (0 << 7);
    flags |= (0 << 4);
    flags |= (incomingHeader.operationCode === 0 ? 0 : 4 << 0);
    header.writeUInt16BE(flags, 2);


    header.writeUInt16BE(1, 4); // question count
    header.writeUInt16BE(1, 6); // answer count
    header.writeUInt16BE(0, 8); // authority count
    header.writeUInt16BE(0, 10); // additional count

    return header;
  }

  encodeIp(ip) {
    const ipParts = ip.split('.');
    return Buffer.from(ipParts.map((part) => parseInt(part)));
  }

  encodeDomainName(domainName) {
    const parts = domainName.split('.');
    return Buffer.concat(
      parts
        .map((part) => {
          const label = Buffer.from(part);
          return Buffer.concat([Buffer.from([part.length]), label]);
        })
        .concat(Buffer.from([0]))
    );
  }

  createQuestionSection() {
    const encodedDomain = this.encodeDomainName(this.domain);
    const typeAndClass = Buffer.alloc(4);
    typeAndClass.writeUInt16BE(1, 0); // type: 1 (A record)
    typeAndClass.writeUInt16BE(1, 2); // class: 1 (IN)

    return Buffer.concat([encodedDomain, typeAndClass]);
  }

  createAnswerSection() {
    const domainBuffer = this.encodeDomainName(this.domain);
    const rest = Buffer.alloc(14);
    rest.writeUInt16BE(1, 0); // type: 1 (A record)
    rest.writeUInt16BE(1, 2); // class: 1 (IN)
    rest.writeUInt16BE(300, 4); // ttl
    rest.writeUInt16BE(4, 8); // rdlength
    rest.writeUInt32BE(this.encodeIp('8.8.8.8'), 10); // rdata

    return Buffer.concat([domainBuffer, rest]);
  }

  parseHeader(buf, offset) {
    const packetId = buf.readUInt16BE(offset);
    const thirdByte = buf.readUInt8(offset + 2);
    const queryOrResponseIndicator = (thirdByte >> 7) & 0b00000001;
    const operationCode = (thirdByte >> 3) & 0b00001111;
    const authoritativeAnswer = (thirdByte >> 2) & 0b00000001;
    const truncation = (thirdByte >> 1) & 0b00000001;
    const recursionDesired = thirdByte & 0b00000001;
    const fourthByte = buf.readUInt8(offset + 3);
    const recursionAvailable = (fourthByte >> 7) & 0b00000001;
    const reserved = (fourthByte >> 4) & 0b00000111;
    const responseCode = fourthByte & 0b00001111;

    const questionCount = buf.readUInt16BE(offset + 4);
    const answerCount = buf.readUInt16BE(offset + 6);
    const authorityCount = buf.readUInt16BE(offset + 8);
    const additionalCount = buf.readUInt16BE(offset + 10);

    return {
      packetId,
      queryOrResponseIndicator,
      operationCode,
      authoritativeAnswer,
      truncation,
      recursionDesired,
      recursionAvailable,
      reserved,
      responseCode,
      questionCount,
      answerCount,
      authorityCount,
      additionalCount,
    };
  }
}

udpSocket.on('message', (buf, rinfo) => {
  try {
    const dns = new DNS('codecrafters.io');
    const header = dns.parseHeader(buf, 0);

    const response = Buffer.concat([
      dns.createDNSHeader(header),
      dns.createQuestionSection(),
      dns.createAnswerSection(),
    ]);
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
