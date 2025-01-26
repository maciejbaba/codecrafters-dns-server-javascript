const dgram = require("dgram");

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

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
  const ipParts = ip.split(".");
  return Buffer.from(ipParts.map(part => parseInt(part)));
}

function createAnswerSection() {
  const encodedDomain = encodeDomainName("codecrafters.io");
  const answer = Buffer.alloc(encodedDomain.length + 14);
  answer.writeUInt16BE(1, 0); // type: 1 (A record)
  answer.writeUInt16BE(1, 2); // class: 1 (IN)
  answer.writeUInt16BE(300, 4); // ttl
  answer.writeUInt16BE(4, 8); // rdlength
  answer.writeUInt32BE(encodeIP("8.8.8.8"), 10); // rdata

  return answer;
}

function encodeDomainName(domainName) {
  const domainSplitted = domainName.split(".");
  const domainPartsInBuffers = domainSplitted.map((part) => {
    return Buffer.from([part.length, ...part.split('').map(char => char.charCodeAt(0))]);
  });

  const encodedDomain = domainPartsInBuffers.reduce((acc, curr) => {
    return Buffer.concat([acc, curr]);
  }, Buffer.alloc(0));

  return encodedDomain;
}

function createQuestionSection() {
  const encodedDomain = encodeDomainName("codecrafters.io");
  const question = Buffer.alloc(5 + encodedDomain.length);
  encodedDomain.copy(question, 0)
  question[encodedDomain.length] = 0; // null byte to terminate the domain name
  question.writeUInt16BE(1, encodedDomain.length + 1); // type: 1 (A record)
  question.writeUInt16BE(1, encodedDomain.length + 3); // class: 1 (IN)

  return question;
}

udpSocket.on("message", (buf, rinfo) => {
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

udpSocket.on("error", (err) => {
  console.log(`Error: ${err}`);
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});
