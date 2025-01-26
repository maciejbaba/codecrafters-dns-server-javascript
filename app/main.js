const dgram = require("dgram");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

function createDNSHeader() {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(1234, 0); // packet id
  header.writeUInt16BE(0x8000, 2); // flags
  header.writeUInt16BE(1, 4); // question count
  header.writeUInt16BE(0, 6); // answer count
  header.writeUInt16BE(0, 8); // authority count
  header.writeUInt16BE(0, 10); // additional count

  return header;
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
    const reponseHeader = createDNSHeader();
    const question = createQuestionSection();

    const response = Buffer.concat([reponseHeader, question]);
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
