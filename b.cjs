
const fs = require('fs/promises');
const {Readable} = require('stream');

const DATA_START = 681            ;
const DATA_LENGTH = 9              ;
async function readableToBuffer(readable) {
  const reader = readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function read() {
  const fd = await fs.open(__filename, 'r');
  const s = fd.createReadStream({start: DATA_START, end: DATA_START + DATA_LENGTH - 1});
  const rs = Readable.toWeb(s);
  const buf = await readableToBuffer(rs);
  console.log(buf);
}
read();

/*	
*/