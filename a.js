import { fork } from "node:child_process";
import { open } from "node:fs/promises";

const content = `
const fs = require('fs/promises');
const {Readable} = require('stream');

const DATA_START = _______1_______;
const DATA_LENGTH = _______2_______;
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
`;

const header = Buffer.concat([Buffer.from(content), Buffer.from("\n/*")]);
const footer = Buffer.from("\n*/");
const start_index = content.indexOf("_______1_______");
const length_index = content.indexOf("_______2_______");

const data = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);

header.write(String(header.byteLength).padEnd(15, " "), start_index);
header.write(String(data.byteLength).padEnd(15, " "), length_index);

const p = "./b.cjs";
const h = await open(p, "w");
await h.write(header, { position: 0 });
await h.write(data, { position: header.byteLength });
await h.write(footer, { position: header.byteLength + data.byteLength });
await h.close();

fork(p, { stdio: "inherit" });
