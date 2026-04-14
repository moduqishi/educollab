import { Server } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { LeveldbPersistence } from 'y-leveldb';
import * as Y from 'yjs';

const persistence = new LeveldbPersistence(process.env.COLLAB_DATA_DIR || './data/collab');

const server = Server.configure({
  port: Number(process.env.COLLAB_PORT || 1234),
  extensions: [new Logger()],
  async onLoadDocument({ documentName }) {
    const update = await persistence.getYDoc(documentName);
    return update;
  },
  async onStoreDocument({ documentName, document }) {
    const update = Y.encodeStateAsUpdate(document);
    await persistence.storeUpdate(documentName, update);
  }
});

server.listen();
console.log(`EduCollab collab server listening on ${process.env.COLLAB_PORT || 1234}`);
